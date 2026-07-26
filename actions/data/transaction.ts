'use server';

import { getCurrentUser } from '@/actions/get-current-user';
import prismaClient from '@/prisma/client';
import { TransactionEditSchema } from '@/schemas/form';
import { GetTransactionsParams } from '@/schemas/params';
import type { Prisma, TransactionStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { getErrorMessage, retryOnTransientWriteConflict } from '../helper';

export async function getTransactions({
  searchParams,
}: {
  searchParams: z.infer<typeof GetTransactionsParams>;
}) {
  const validatedParams = GetTransactionsParams.safeParse(searchParams);

  if (!validatedParams.success) return [];

  const { eventId, name } = validatedParams.data;

  if (!eventId) return [];

  const query: Prisma.TransactionWhereInput = { eventId };

  if (name) {
    query.payerName = { contains: name.trim(), mode: 'insensitive' };
  }

  try {
    return await prismaClient.transaction.findMany({
      where: query,
      include: { wishlistGift: { include: { gift: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    return [];
  }
}

export async function updateTransactionNotes(
  transactionId: string,
  values: z.infer<typeof TransactionEditSchema>
) {
  const validatedFields = TransactionEditSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' };
  }

  try {
    const transaction = await prismaClient.transaction.findUnique({
      where: { id: transactionId },
      select: { pagoparHash: true, eventId: true },
    });

    if (!transaction) {
      return { error: 'Transacción no encontrada.' };
    }

    // A guest can pay for several gifts in one Pagopar checkout — those
    // transactions share pagoparHash. Thanking one thanks the whole
    // checkout, so the organizer doesn't have to repeat it per gift.
    if (transaction.pagoparHash) {
      await prismaClient.transaction.updateMany({
        where: {
          pagoparHash: transaction.pagoparHash,
          eventId: transaction.eventId,
        },
        data: { notes: validatedFields.data.notes },
      });
    } else {
      await prismaClient.transaction.update({
        where: { id: transactionId },
        data: { notes: validatedFields.data.notes },
      });
    }

    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction notes:', error);
    return { error: getErrorMessage(error) };
  }
}

// Undoes the atomic claim from createTransactionsForCart (actions/data/checkout.ts).
async function releaseWishlistGiftClaim(transaction: {
  id: string;
  wishlistGiftId: string;
  amount: string;
}) {
  const wishlistGift = await prismaClient.wishlistGift.findUnique({
    where: { id: transaction.wishlistGiftId },
    select: { isGroupGift: true, claimedTransactionId: true },
  });

  if (!wishlistGift) return;

  if (wishlistGift.isGroupGift) {
    await prismaClient.wishlistGift.update({
      where: { id: transaction.wishlistGiftId },
      data: {
        reservedAmount: { decrement: Number(transaction.amount) || 0 },
      },
    });
    return;
  }

  if (wishlistGift.claimedTransactionId === transaction.id) {
    await prismaClient.wishlistGift.update({
      where: { id: transaction.wishlistGiftId },
      data: { claimedTransactionId: null, claimedAt: null },
    });
  }
}

async function recomputeWishlistGiftProgress(wishlistGiftId: string) {
  const wishlistGift = await prismaClient.wishlistGift.findUnique({
    where: { id: wishlistGiftId },
    include: {
      gift: true,
      transactions: { where: { status: 'COMPLETED' } },
    },
  });

  if (!wishlistGift) return;

  const price = Number(wishlistGift.gift.price) || 0;
  const contributed = wishlistGift.transactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  );

  await prismaClient.wishlistGift.update({
    where: { id: wishlistGiftId },
    data: {
      ...(wishlistGift.isGroupGift
        ? { groupGiftParts: String(contributed) }
        : {}),
      isFullyPaid: price > 0 && contributed >= price,
    },
  });
}

export async function applyTransactionStatusChange(
  transactionId: string,
  status: TransactionStatus,
  changedById: string | null
) {
  const transaction = await prismaClient.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || transaction.status === status) return;

  // A delayed webhook can't resurrect a released (FAILED/REFUNDED)
  // transaction into COMPLETED — its slot may already be reclaimed.
  // Only an admin override (changedById set) is allowed to do that.
  if (
    changedById === null &&
    status === 'COMPLETED' &&
    (transaction.status === 'FAILED' || transaction.status === 'REFUNDED')
  ) {
    return;
  }

  // Conditional updateMany makes a duplicate/concurrent call a no-op (count: 0).
  const count = await retryOnTransientWriteConflict(() =>
    prismaClient.$transaction(async tx => {
      const result = await tx.transaction.updateMany({
        where: { id: transactionId, status: { not: status } },
        data: { status },
      });

      if (result.count === 0) return 0;

      await tx.transactionStatusLog.create({
        data: {
          transactionId,
          previousStatus: transaction.status,
          status,
          changedById,
        },
      });

      return result.count;
    })
  );

  if (count === 0) return;

  if (status === 'FAILED' || status === 'REFUNDED') {
    await releaseWishlistGiftClaim(transaction);
  }

  await recomputeWishlistGiftProgress(transaction.wishlistGiftId);
}

// Staff-only (User.role === 'ADMIN', set manually in the DB): reads across
// every event, not scoped to the logged-in user's own event like
// getTransactions above.
export async function getAllTransactionsForAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== 'ADMIN') return [];

  try {
    return await prismaClient.transaction.findMany({
      include: {
        wishlistGift: { include: { gift: true } },
        event: { include: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error retrieving transactions for admin:', error);
    return [];
  }
}

export async function updateTransactionStatusAsAdmin(
  transactionId: string,
  status: TransactionStatus
) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return { error: 'No autorizado.' };
  }

  const validatedStatus = TransactionEditSchema.shape.status.safeParse(status);

  if (!validatedStatus.success) {
    return { error: 'Estado inválido.' };
  }

  const transaction = await prismaClient.transaction.findUnique({
    where: { id: transactionId },
    select: { paymentMethod: true },
  });

  if (transaction?.paymentMethod === 'CARD') {
    return {
      error: 'El estado de pagos con tarjeta lo administra Pagopar.',
    };
  }

  try {
    await applyTransactionStatusChange(
      transactionId,
      validatedStatus.data,
      currentUser.id
    );

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction status as admin:', error);
    return { error: getErrorMessage(error) };
  }
}
