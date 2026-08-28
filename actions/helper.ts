import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
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

export class PriceLockedError extends Error {}

export async function assertPriceEditAllowed(
  wishlistGiftId: string,
  newPrice: string,
  tx: Prisma.TransactionClient | typeof prismaClient
) {
  const wishlistGift = await tx.wishlistGift.findUnique({
    where: { id: wishlistGiftId },
    select: {
      gift: { select: { price: true } },
      isFullyPaid: true,
      groupGiftParts: true,
      reservedQuantity: true,
      transactions: {
        where: { status: 'COMPLETED' },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (
    wishlistGift &&
    wishlistGift.gift.price !== newPrice &&
    (wishlistGift.isFullyPaid ||
      wishlistGift.reservedQuantity > 0 ||
      Number(wishlistGift.groupGiftParts) > 0 ||
      (wishlistGift.transactions?.length ?? 0) > 0)
  ) {
    throw new PriceLockedError()
  }
}

export class WishlistGiftMutationError extends Error {}

export function revalidateGiftAndWishlistPaths() {
  try {
    revalidatePath('/wishlist')
    revalidatePath('/gifts')
    revalidatePath('/dashboard')
  } catch (error) {
    // The database transaction has already committed. A cache invalidation
    // failure must not tell the form to retry and create another mutation.
    console.error('Error revalidating gift paths:', error)
  }
}
