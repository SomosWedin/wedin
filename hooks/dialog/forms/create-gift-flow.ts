import { createAdminGift } from '@/actions/data/gift'
import { createGiftWithWishlistGift } from '@/actions/data/wishlist-gift'
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

  if (isAdmin) {
    const giftResponse = await createAdminGift({
      name: params.values.name,
      categoryId: params.values.categoryId,
      price: params.values.price,
      imageUrl: params.imageUrl,
      giftlistIds: params.values.giftlistIds,
    })

    if (giftResponse.error || !giftResponse.giftId) {
      return {
        error: giftResponse.error ?? 'No se pudo crear el regalo',
        step: 'gift',
      }
    }

    return { giftId: giftResponse.giftId }
  }

  const response = await createGiftWithWishlistGift({
    gift: {
      name: params.values.name,
      categoryId: params.values.categoryId,
      price: params.values.price,
      isDefault: false,
      eventId: params.eventId,
      imageUrl: params.imageUrl,
    },
    wishlistGift: {
      wishlistId: params.wishlistId,
      eventId: params.eventId,
      isFavoriteGift: params.values.isFavoriteGift,
      isGroupGift: params.values.isGroupGift,
      quantity: params.values.quantity,
    },
  })

  if ('error' in response) {
    return {
      error: response.error,
      step: 'wishlist',
    }
  }

  return {
    giftId: response.giftId,
    wishlistGiftId: response.wishlistGiftId,
  }
}
