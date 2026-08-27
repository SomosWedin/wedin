import { createGift } from '@/actions/data/gift'
import { createWishlistGift } from '@/actions/data/wishlist-gift'
import type { GiftFormValues } from '@/schemas/form'

export type GiftCreationMode =
  | { mode: 'admin' }
  | { mode: 'wishlist'; eventId: string; wishlistId: string }

type CreateGiftFlowParams = GiftCreationMode & {
  values: GiftFormValues
  imageUrl: string
}

type CreateGiftFlowResult =
  | { giftId: string; wishlistGiftId?: string; error?: never; step?: never }
  | { error: string; step: 'gift' | 'wishlist' }

export async function createGiftFlow(
  params: CreateGiftFlowParams
): Promise<CreateGiftFlowResult> {
  const isAdmin = params.mode === 'admin'
  const giftResponse = await createGift({
    ...params.values,
    isDefault: isAdmin,
    eventId: isAdmin ? undefined : params.eventId,
    imageUrl: params.imageUrl,
  })

  if (giftResponse.error || !giftResponse.giftId) {
    return {
      error: giftResponse.error ?? 'No se pudo crear el regalo',
      step: 'gift',
    }
  }

  if (isAdmin) return { giftId: giftResponse.giftId }

  const wishlistResponse = await createWishlistGift({
    wishlistId: params.wishlistId,
    eventId: params.eventId,
    giftId: giftResponse.giftId,
    isFavoriteGift: params.values.isFavoriteGift,
    isGroupGift: params.values.isGroupGift,
    quantity: params.values.quantity,
  })

  if (wishlistResponse.error || !wishlistResponse.wishlistGiftId) {
    return {
      error:
        wishlistResponse.error ?? 'No se pudo agregar el regalo a tu lista',
      step: 'wishlist',
    }
  }

  return {
    giftId: giftResponse.giftId,
    wishlistGiftId: wishlistResponse.wishlistGiftId,
  }
}
