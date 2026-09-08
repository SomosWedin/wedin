import type { Prisma } from '@prisma/client'

type WishlistGiftPayload = Prisma.WishlistGiftGetPayload<{
  include: {
    gift: { include: { image: true } }
    transactions: { select: { amount: true; quantity: true } }
  }
}>

export type WishlistGiftWithGift = WishlistGiftPayload & {
  gift: NonNullable<WishlistGiftPayload['gift']>
}

export function hasGift(
  wishlistGift: WishlistGiftPayload
): wishlistGift is WishlistGiftWithGift {
  return wishlistGift.gift !== null
}
