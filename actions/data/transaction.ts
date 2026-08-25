'use server'

import type { Prisma, TransactionStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import { TransactionEditSchema } from '@/schemas/form'
import { GetTransactionsParams } from '@/schemas/params'
import { getErrorMessage, retryOnTransientWriteConflict } from '../helper'

export async function getTransactions({
  searchParams,
}: {
  searchParams: z.infer<typeof GetTransactionsParams>
}) {
  const validatedParams = GetTransactionsParams.safeParse(searchParams)

  if (!validatedParams.success) return []

  const { eventId, name } = validatedParams.data

  if (!eventId) return []

  const query: Prisma.TransactionWhereInput = { eventId }

  if (name) {
    query.payerName = { contains: name.trim(), mode: 'insensitive' }
  }

  try {
    return await prismaClient.transaction.findMany({
      where: query,
      include: { wishlistGift: { include: { gift: true } } },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error retrieving transactions:', error)
    return []
  }
}

export async function updateTransactionNotes(
  transactionId: string,
  values: z.infer<typeof TransactionEditSchema>
) {
  const validatedFields = TransactionEditSchema.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  try {
    const transaction = await prismaClient.transaction.findUnique({
      where: { id: transactionId },
      select: {
        pagoparHash: true,
        bankTransferGroupId: true,
        eventId: true,
      },
    })

    if (!transaction) {
      return { error: 'Transacción no encontrada.' }
    }

    // A guest can pay for several gifts in one checkout — CARD transactions
    // share pagoparHash, BANK_TRANSFER ones share bankTransferGroupId.
    // Thanking one thanks the whole checkout, so the organizer doesn't have
    // to repeat it per gift.
    const groupWhere = transaction.pagoparHash
      ? { pagoparHash: transaction.pagoparHash }
      : transaction.bankTransferGroupId
        ? { bankTransferGroupId: transaction.bankTransferGroupId }
        : null

    if (groupWhere) {
      await prismaClient.transaction.updateMany({
        where: { ...groupWhere, eventId: transaction.eventId },
        data: { notes: validatedFields.data.notes },
      })
    } else {
      await prismaClient.transaction.update({
        where: { id: transactionId },
        data: { notes: validatedFields.data.notes },
      })
    }

    revalidatePath('/transactions')
    return { success: true }
  } catch (error) {
    console.error('Error updating transaction notes:', error)
    return { error: getErrorMessage(error) }
  }
}

// Adjusts the atomic claim from createTransactionsForCart
// (actions/data/checkout.ts) by a signed delta — shared by release
// (negative, on FAILED/REFUNDED) and reclaim (positive, when an admin
// override resurrects a transaction back out of FAILED/REFUNDED) below.
async function adjustWishlistGiftClaim(
  transaction: { wishlistGiftId: string; amount: string; quantity: number },
  amountDelta: number,
  quantityDelta: number
) {
  const wishlistGift = await prismaClient.wishlistGift.findUnique({
    where: { id: transaction.wishlistGiftId },
    select: { isGroupGift: true },
  })

  if (!wishlistGift) return

  if (wishlistGift.isGroupGift) {
    await prismaClient.wishlistGift.update({
      where: { id: transaction.wishlistGiftId },
      data: { reservedAmount: { increment: amountDelta } },
    })
    return
  }

  await prismaClient.wishlistGift.update({
    where: { id: transaction.wishlistGiftId },
    data: { reservedQuantity: { increment: quantityDelta } },
  })
}

function releaseWishlistGiftClaim(transaction: {
  wishlistGiftId: string
  amount: string
  quantity: number
}) {
  return adjustWishlistGiftClaim(
    transaction,
    -(Number(transaction.amount) || 0),
    -transaction.quantity
  )
}

function reclaimWishlistGiftClaim(transaction: {
  wishlistGiftId: string
  amount: string
  quantity: number
}) {
  return adjustWishlistGiftClaim(
    transaction,
    Number(transaction.amount) || 0,
    transaction.quantity
  )
}

// Transaction + retry so concurrent completions on the same gift can't
// lose an update via a stale read-then-write race.
export async function recomputeWishlistGiftProgress(wishlistGiftId: string) {
  await retryOnTransientWriteConflict(() =>
    prismaClient.$transaction(async tx => {
      const wishlistGift = await tx.wishlistGift.findUnique({
        where: { id: wishlistGiftId },
        include: {
          gift: true,
          transactions: { where: { status: 'COMPLETED' } },
        },
      })

      if (!wishlistGift) return

      if (wishlistGift.isGroupGift) {
        const price = Number(wishlistGift.gift.price) || 0
        const contributed = wishlistGift.transactions.reduce(
          (sum, transaction) => sum + (Number(transaction.amount) || 0),
          0
        )

        await tx.wishlistGift.update({
          where: { id: wishlistGiftId },
          data: {
            groupGiftParts: String(contributed),
            isFullyPaid: price > 0 && contributed >= price,
          },
        })
        return
      }

      const completedQty = wishlistGift.transactions.reduce(
        (sum, transaction) => sum + transaction.quantity,
        0
      )

      await tx.wishlistGift.update({
        where: { id: wishlistGiftId },
        data: { isFullyPaid: completedQty >= wishlistGift.quantity },
      })
    })
  )
}

export async function applyTransactionStatusChange(
  transactionId: string,
  status: TransactionStatus,
  changedById: string | null
) {
  const transaction = await prismaClient.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction || transaction.status === status) return

  // A delayed webhook can't resurrect a released (FAILED/REFUNDED)
  // transaction into COMPLETED — its slot may already be reclaimed.
  // Only an admin override (changedById set) is allowed to do that.
  if (
    changedById === null &&
    status === 'COMPLETED' &&
    (transaction.status === 'FAILED' || transaction.status === 'REFUNDED')
  ) {
    console.error(
      `Pagopar webhook reported COMPLETED for transaction ${transactionId}, but it's already ${transaction.status} — needs manual reconciliation via /admin.`,
      { transactionId, wishlistGiftId: transaction.wishlistGiftId }
    )
    return
  }

  // Conditional updateMany makes a duplicate/concurrent call a no-op (count: 0).
  const count = await retryOnTransientWriteConflict(() =>
    prismaClient.$transaction(async tx => {
      const result = await tx.transaction.updateMany({
        where: { id: transactionId, status: { not: status } },
        data: { status },
      })

      if (result.count === 0) return 0

      await tx.transactionStatusLog.create({
        data: {
          transactionId,
          previousStatus: transaction.status,
          status,
          changedById,
        },
      })

      return result.count
    })
  )

  if (count === 0) return

  if (status === 'FAILED' || status === 'REFUNDED') {
    await releaseWishlistGiftClaim(transaction)
  } else if (
    transaction.status === 'FAILED' ||
    transaction.status === 'REFUNDED'
  ) {
    await reclaimWishlistGiftClaim(transaction)
  }

  await recomputeWishlistGiftProgress(transaction.wishlistGiftId)
}

// Staff-only (User.role === 'ADMIN', set manually in the DB): reads across
// every event, not scoped to the logged-in user's own event like
// getTransactions above.
export async function getAllTransactionsForAdmin() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') return []

  try {
    return await prismaClient.transaction.findMany({
      include: {
        wishlistGift: { include: { gift: true } },
        event: { include: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error retrieving transactions for admin:', error)
    return []
  }
}

export async function updateTransactionStatusAsAdmin(
  transactionId: string,
  status: TransactionStatus
) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    return { error: 'No autorizado.' }
  }

  const validatedStatus = TransactionEditSchema.shape.status.safeParse(status)

  if (!validatedStatus.success) {
    return { error: 'Estado inválido.' }
  }

  const transaction = await prismaClient.transaction.findUnique({
    where: { id: transactionId },
    select: { paymentMethod: true, bankTransferGroupId: true, eventId: true },
  })

  if (transaction?.paymentMethod === 'CARD') {
    return {
      error: 'El estado de pagos con tarjeta lo administra Pagopar.',
    }
  }

  try {
    // A guest can pay for several gifts in one bank transfer — those
    // transactions share bankTransferGroupId. One proof of transfer covers
    // the whole group, so confirming (or rejecting) one confirms them all.
    const transactionIds = transaction?.bankTransferGroupId
      ? (
          await prismaClient.transaction.findMany({
            where: {
              bankTransferGroupId: transaction.bankTransferGroupId,
              eventId: transaction.eventId,
            },
            select: { id: true },
          })
        ).map(({ id }) => id)
      : [transactionId]

    for (const id of transactionIds) {
      await applyTransactionStatusChange(
        id,
        validatedStatus.data,
        currentUser.id
      )
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error updating transaction status as admin:', error)
    return { error: getErrorMessage(error) }
  }
}
