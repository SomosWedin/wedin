'use client'

import { editGiftWithWishlistGift } from '@/actions/data/wishlist-gift'
import type { GiftFormValues } from '@/schemas/form'
import {
  type GiftWithImage,
  useGiftFormController,
} from './use-gift-form-controller'

export type EditableGift = GiftWithImage

type UseEditWishlistGiftProps = {
  wishlistGiftId: string
  wishlistId: string
  eventId: string
  gift: EditableGift
  isFavoriteGift: boolean
  isGroupGift: boolean
  quantity: number
}

export function useEditWishlistGift({
  wishlistGiftId,
  wishlistId,
  eventId,
  gift,
  isFavoriteGift,
  isGroupGift,
  quantity,
}: UseEditWishlistGiftProps) {
  const defaultValues: GiftFormValues = {
    name: gift.name,
    categoryId: gift.categoryId,
    giftlistIds: [],
    price: gift.price,
    isDefault: false,
    eventId,
    imageUrl: gift.image?.url ?? '',
    wishlistId,
    isFavoriteGift,
    isGroupGift,
    quantity,
  }

  return useGiftFormController({
    defaultValues,
    initialImageUrl: gift.image?.url,
    submit: async ({ values, imageUrl }) => {
      const response = await editGiftWithWishlistGift({
        gift: {
          name: values.name,
          categoryId: values.categoryId,
          price: values.price,
          imageUrl,
        },
        wishlistGift: {
          wishlistGiftId,
          wishlistId,
          isFavoriteGift: values.isFavoriteGift,
          isGroupGift: values.isGroupGift,
          quantity: values.quantity,
        },
      })

      if ('error' in response) {
        return {
          success: false,
          feedback: {
            title: 'Error al editar el regalo',
            description: response.error,
            variant: 'destructive',
          },
        }
      }

      return {
        success: true,
        feedback: { title: 'Regalo actualizado. ✅' },
      }
    },
    unexpectedErrorTitle: 'No pudimos editar el regalo',
    errorContext: 'Error editing wishlist gift:',
  })
}
