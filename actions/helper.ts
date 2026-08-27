import { Prisma } from '@prisma/client'
import type prismaClient from '@/prisma/client'

// Retries Mongo's transient write-conflict error (P2034) under real
// concurrency — expected, not a genuine failure.
export async function retryOnTransientWriteConflict<T>(
  fn: () => Promise<T>
): Promise<T> {
  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isTransientWriteConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'

      if (!isTransientWriteConflict || attempt === maxAttempts) throw error
    }
  }

  throw new Error('unreachable')
}

export const getErrorMessage = (error: unknown): string => {
  let message: string

  if (error instanceof Error) {
    message = error.message
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String(error.message)
  } else if (typeof error === 'string') {
    message = error
  } else {
    message = 'Something went wrong'
  }

  return message
}

export class PriceLockedError extends Error { }

export async function assertPriceEditAllowed(
  wishlistGiftId: string,
  newPrice: string,
  tx: Prisma.TransactionClient | typeof prismaClient
) {
  const wishlistGift = await tx.wishlistGift.findUnique({
    where: { id: wishlistGiftId },
    select: {
      gift: { select: { price: true } },
      isGroupGift: true,
      reservedQuantity: true,
    },
  })

  if (
    wishlistGift &&
    wishlistGift.gift.price !== newPrice &&
    !wishlistGift.isGroupGift &&
    wishlistGift.reservedQuantity > 0
  ) {
    throw new PriceLockedError()
  }
}
