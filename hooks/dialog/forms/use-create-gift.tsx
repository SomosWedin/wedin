'use client'

import { useRouter } from 'next/navigation'
import { ToastAction } from '@/components/ui/toast'
import type { GiftFormValues } from '@/schemas/form'
import { createGiftFlow, type GiftCreationMode } from './create-gift-flow'
import { useGiftFormController } from './use-gift-form-controller'

export function useCreateGift(mode: GiftCreationMode) {
  const router = useRouter()
  const isAdmin = mode.mode === 'admin'

  const defaultValues: GiftFormValues = {
    name: '',
    categoryId: '',
    price: '',
    isDefault: isAdmin,
    eventId: isAdmin ? undefined : mode.eventId,
    giftlistId: undefined,
    newGiftlistName: undefined,
    imageUrl: '',
    wishlistId: isAdmin ? undefined : mode.wishlistId,
    isFavoriteGift: false,
    isGroupGift: false,
    quantity: 1,
  }

  return useGiftFormController({
    defaultValues,
    submit: async ({ values, imageUrl }) => {
      const result = await createGiftFlow({ ...mode, values, imageUrl })

      if (result.error) {
        return {
          success: false,
          feedback: {
            title:
              result.step === 'gift'
                ? 'Error al crear el regalo'
                : 'Error al agregar el regalo a tu lista',
            description: result.error,
            variant: 'destructive',
          },
        }
      }

      return {
        success: true,
        feedback:
          mode.mode === 'wishlist'
            ? {
              title: 'Regalo agregado a tu lista. 🎁',
              action: (
                <ToastAction
                  altText="Ver lista"
                  onClick={() => router.push('/wishlist')}
                >
                  Ver lista
                </ToastAction>
              ),
            }
            : undefined,
      }
    },
    unexpectedErrorTitle: 'No pudimos crear el regalo',
    errorContext: 'Error creating gift:',
  })
}
