'use server';

import prismaClient from '@/prisma/client';
import { TransactionEditSchema } from '@/schemas/form';
import { GetTransactionsParams } from '@/schemas/params';
import type { Prisma, TransactionStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { getErrorMessage } from '../helper';

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
    await prismaClient.transaction.update({
      where: { id: transactionId },
      data: { notes: validatedFields.data.notes },
    });

    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction notes:', error);
    return { error: getErrorMessage(error) };
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

  await prismaClient.$transaction([
    prismaClient.transaction.update({
      where: { id: transactionId },
      data: { status },
    }),
    prismaClient.transactionStatusLog.create({
      data: {
        transactionId,
        previousStatus: transaction.status,
        status,
        changedById,
      },
    }),
  ]);

  await recomputeWishlistGiftProgress(transaction.wishlistGiftId);
}
