'use client'

import type { Giftlist } from '@prisma/client'
import { editAdminGiftlist } from '@/actions/data/giftlist'
import type { AdminGiftlistValues } from '@/schemas/form'
import { useGiftlistFormController } from './use-giftlist-form-controller'

export function useEditAdminGiftlist(giftlist: Giftlist) {
  const defaultValues: AdminGiftlistValues = {
    name: giftlist.name,
  }

  return useGiftlistFormController({
    defaultValues,
    submit: async values => {
      const response = await editAdminGiftlist(giftlist.id, values)
      return response.error
        ? {
            success: false,
            feedback: {
              title: 'Error al editar la colección',
              description: response.error,
              variant: 'destructive',
            },
          }
        : { success: true, feedback: { title: 'Colección actualizada.' } }
    },
    unexpectedErrorTitle: 'No pudimos editar la colección',
    errorContext: 'Error editing admin giftlist:',
  })
}
