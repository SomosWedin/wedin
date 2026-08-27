'use client'

import { editAdminGift } from '@/actions/data/gift'
import {
  type GiftWithImage,
  useGiftFormController,
} from '@/hooks/dialog/forms/use-gift-form-controller'
import type { GiftFormValues } from '@/schemas/form'

export type EditableAdminGift = GiftWithImage

export function useEditAdminGift(gift: EditableAdminGift) {
  const { name, categoryId, price, giftlistId, image, id: giftId } = gift

  const defaultValues: GiftFormValues = {
    name: name,
    categoryId: categoryId,
    price: price,
    isDefault: true,
    eventId: undefined,
    giftlistId: giftlistId ?? undefined,
    newGiftlistName: undefined,
    imageUrl: image?.url ?? '',
    wishlistId: undefined,
    isFavoriteGift: false,
    isGroupGift: false,
    quantity: 1,
  }

  return useGiftFormController({
    defaultValues,
    initialImageUrl: image?.url,
    submit: async ({ values, imageUrl }) => {
      const response = await editAdminGift(
        {
          name: values.name,
          categoryId: values.categoryId,
          price: values.price,
          imageUrl,
          giftlistId: values.giftlistId,
          newGiftlistName: values.newGiftlistName,
        },
        giftId
      )

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
    errorContext: 'Error editing admin gift:',
  })
}
