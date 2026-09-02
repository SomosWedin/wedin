'use client'

import { createAdminEventType } from '@/actions/data/event-type'
import type { AdminEventTypeValues } from '@/schemas/form'
import { useEventTypeFormController } from './use-event-type-form-controller'

const defaultValues: AdminEventTypeValues = { name: '' }

export function useCreateAdminEventType() {
  return useEventTypeFormController({
    defaultValues,
    submit: async values => {
      const response = await createAdminEventType(values)
      return response.error
        ? {
            success: false,
            feedback: {
              title: 'Error al crear el tipo de evento',
              description: response.error,
              variant: 'destructive',
            },
          }
        : { success: true, feedback: { title: 'Tipo de evento creado.' } }
    },
  })
}
