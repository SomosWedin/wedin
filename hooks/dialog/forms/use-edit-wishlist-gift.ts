'use client'

import { createGift, editGift } from '@/actions/data/gift'
import { editWishlistGift } from '@/actions/data/wishlist-gift'
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
    submit: async ({ values, imageUrl, hasNewImage }) => {
      const hasGiftChanges =
        values.name !== gift.name ||
        values.categoryId !== gift.categoryId ||
        values.price !== gift.price ||
        hasNewImage

      let giftId = gift.id

      if (hasGiftChanges) {
        const giftResponse = gift.isDefault
          ? await createGift(
            { ...values, isDefault: false, imageUrl },
            wishlistGiftId
          )
          : await editGift({ ...values, imageUrl }, gift.id, wishlistGiftId)

        if (giftResponse.error || !giftResponse.giftId) {
          return {
            success: false,
            feedback: {
              title: 'Error al guardar los cambios del regalo',
              description: giftResponse.error,
              variant: 'destructive',
            },
          }
        }

        giftId = giftResponse.giftId
      }

      const response = await editWishlistGift({
        wishlistGiftId,
        wishlistId,
        giftId,
        isFavoriteGift: values.isFavoriteGift,
        isGroupGift: values.isGroupGift,
        quantity: values.quantity,
      })

      if (response.error) {
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
