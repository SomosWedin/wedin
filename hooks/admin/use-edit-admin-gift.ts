'use client'

import { editDefaultGiftAsAdmin } from '@/actions/data/gift'
import {
  type GiftWithImage,
  useGiftFormController,
} from '@/hooks/dialog/forms/use-gift-form-controller'
import type { GiftFormValues } from '@/schemas/form'

export type EditableAdminGift = GiftWithImage

export function useEditAdminGift(gift: EditableAdminGift) {
  const defaultValues: GiftFormValues = {
    name: gift.name,
    categoryId: gift.categoryId,
    price: gift.price,
    isDefault: true,
    eventId: undefined,
    imageUrl: gift.image?.url ?? '',
    wishlistId: undefined,
    isFavoriteGift: false,
    isGroupGift: false,
    quantity: 1,
  }

  return useGiftFormController({
    defaultValues,
    initialImageUrl: gift.image?.url,
    submit: async ({ values, imageUrl }) => {
      const response = await editDefaultGiftAsAdmin(
        { ...values, imageUrl },
        gift.id
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
