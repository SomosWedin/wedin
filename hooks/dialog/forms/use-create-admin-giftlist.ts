'use client'

import { createAdminGiftlist } from '@/actions/data/giftlist'
import type { AdminGiftlistValues } from '@/schemas/form'
import { useGiftlistFormController } from './use-giftlist-form-controller'

const defaultValues: AdminGiftlistValues = { name: '' }

export function useCreateAdminGiftlist() {
  return useGiftlistFormController({
    defaultValues,
    submit: async values => {
      const response = await createAdminGiftlist(values)
      return response.error
        ? {
            success: false,
            feedback: {
              title: 'Error al crear la colección',
              description: response.error,
              variant: 'destructive',
            },
          }
        : { success: true, feedback: { title: 'Colección creada.' } }
    },
    unexpectedErrorTitle: 'No pudimos crear la colección',
    errorContext: 'Error creating admin giftlist:',
  })
}
