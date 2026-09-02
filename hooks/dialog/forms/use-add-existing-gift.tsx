'use client'

import { useRouter } from 'next/navigation'
import {
  createGiftWithWishlistGift,
  createWishlistGift,
} from '@/actions/data/wishlist-gift'
import { ToastAction } from '@/components/ui/toast'
import type { GiftFormValues } from '@/schemas/form'
import {
  type GiftWithImage,
  useGiftFormController,
} from './use-gift-form-controller'

export type ExistingGift = GiftWithImage

type UseAddExistingGiftProps = {
  gift: ExistingGift
  eventId: string
  wishlistId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function useAddExistingGift({
  gift,
  eventId,
  wishlistId,
  open,
  onOpenChange,
}: UseAddExistingGiftProps) {
  const router = useRouter()
  const defaultValues: GiftFormValues = {
    name: gift.name,
    categoryId: gift.categoryId,
    giftlistIds: [],
    price: gift.price,
    isDefault: false,
    eventId,
    imageUrl: gift.image?.url ?? '',
    wishlistId,
    isFavoriteGift: false,
    isGroupGift: false,
    quantity: 1,
  }

  return useGiftFormController({
    defaultValues,
    initialImageUrl: gift.image?.url,
    open,
    onOpenChange,
    submit: async ({ values, imageUrl, hasNewImage }) => {
      const hasChanges =
        values.name !== gift.name ||
        values.categoryId !== gift.categoryId ||
        values.price !== gift.price ||
        hasNewImage

      if (hasChanges) {
        const response = await createGiftWithWishlistGift({
          gift: {
            name: values.name,
            categoryId: values.categoryId,
            price: values.price,
            isDefault: false,
            eventId,
            imageUrl,
          },
          wishlistGift: {
            wishlistId,
            eventId,
            isFavoriteGift: values.isFavoriteGift,
            isGroupGift: values.isGroupGift,
            quantity: values.quantity,
          },
        })

        if ('error' in response) {
          return {
            success: false,
            feedback: {
              title: 'Error al agregar el regalo a tu lista',
              description: response.error,
              variant: 'destructive',
            },
          }
        }
      } else {
        const response = await createWishlistGift({
          wishlistId,
          eventId,
          giftId: gift.id,
          isFavoriteGift: values.isFavoriteGift,
          isGroupGift: values.isGroupGift,
          quantity: values.quantity,
        })

        if ('error' in response) {
          return {
            success: false,
            feedback: {
              title: 'Error al agregar el regalo a tu lista',
              description: response.error,
              variant: 'destructive',
            },
          }
        }
      }

      return {
        success: true,
        feedback: {
          title: 'Regalo agregado a tu lista. 🎁',
          action: (
            <ToastAction
              altText="Ver lista"
              onClick={() => router.push('/wishlist')}
            >
              Ver lista
            </ToastAction>
          ),
        },
      }
    },
    unexpectedErrorTitle: 'No pudimos agregar el regalo',
    errorContext: 'Error adding existing gift:',
  })
}
