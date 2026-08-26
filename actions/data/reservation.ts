import type { Prisma } from '@prisma/client'
import prismaClient from '@/prisma/client'
import { applyTransactionStatusChange } from './transaction'

const CARD_OPEN_TIMEOUT_MINUTES = 3
const CARD_PENDING_TIMEOUT_MINUTES = 30
const BANK_TRANSFER_TIMEOUT_HOURS = 48

const MAX_HOLDS_PER_SWEEP = 25

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000)
}

type ReleaseExpiredHoldsScope = {
  wishlistGiftIds?: string[]
  wishlistId?: string
  eventId?: string
}

export async function releaseExpiredHolds(scope: ReleaseExpiredHoldsScope) {
  const { wishlistGiftIds, wishlistId, eventId } = scope

  if (!wishlistGiftIds?.length && !wishlistId && !eventId) return

  const where: Prisma.TransactionWhereInput = {
    ...(wishlistGiftIds?.length
      ? { wishlistGiftId: { in: wishlistGiftIds } }
      : {}),
    ...(wishlistId ? { wishlistGift: { wishlistId } } : {}),
    ...(eventId ? { eventId } : {}),
    OR: [
      {
        paymentMethod: 'CARD',
        status: 'OPEN',
        createdAt: { lt: minutesAgo(CARD_OPEN_TIMEOUT_MINUTES) },
      },
      {
        paymentMethod: 'CARD',
        status: 'PENDING',
        createdAt: { lt: minutesAgo(CARD_PENDING_TIMEOUT_MINUTES) },
      },
      {
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING',
        createdAt: { lt: minutesAgo(BANK_TRANSFER_TIMEOUT_HOURS * 60) },
      },
    ],
  }

  try {
    const staleTransactions = await prismaClient.transaction.findMany({
      where,
      select: { id: true },
      take: MAX_HOLDS_PER_SWEEP,
    })

    for (const { id } of staleTransactions) {
      await applyTransactionStatusChange(id, 'FAILED', null)
    }
  } catch (error) {
    console.error('Error releasing expired holds:', error)
  }
}
