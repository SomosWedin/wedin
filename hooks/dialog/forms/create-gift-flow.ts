import { createGift } from '@/actions/data/gift'
import { createWishlistGift } from '@/actions/data/wishlist-gift'
import type { GiftFormValues } from '@/schemas/form'

type CreateGiftFlowParams = {
  values: GiftFormValues
  imageUrl: string
  isAdminRoute: boolean
  eventId?: string
  wishlistId?: string
}

type CreateGiftFlowResult =
  | { giftId: string; wishlistGiftId?: string; error?: never; step?: never }
  | { error: string; step: 'gift' | 'wishlist' }

export async function createGiftFlow({
  values,
  imageUrl,
  isAdminRoute,
  eventId,
  wishlistId,
}: CreateGiftFlowParams): Promise<CreateGiftFlowResult> {
  const giftResponse = await createGift({
    ...values,
    isDefault: isAdminRoute,
    eventId: isAdminRoute ? undefined : eventId,
    imageUrl,
  })

  if (giftResponse.error || !giftResponse.giftId) {
    return {
      error: giftResponse.error ?? 'No se pudo crear el regalo',
      step: 'gift',
    }
  }

  if (isAdminRoute || !wishlistId || !eventId) {
    return { giftId: giftResponse.giftId }
  }

  const wishlistResponse = await createWishlistGift({
    wishlistId,
    eventId,
    giftId: giftResponse.giftId,
    isFavoriteGift: values.isFavoriteGift,
    isGroupGift: values.isGroupGift,
    quantity: values.quantity,
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
