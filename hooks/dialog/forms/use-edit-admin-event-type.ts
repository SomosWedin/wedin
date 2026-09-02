'use client'

import type { EventType } from '@prisma/client'
import { editAdminEventType } from '@/actions/data/event-type'
import type { AdminEventTypeValues } from '@/schemas/form'
import { useEventTypeFormController } from './use-event-type-form-controller'

export function useEditAdminEventType(eventType: EventType) {
  const defaultValues: AdminEventTypeValues = { name: eventType.name }

  return useEventTypeFormController({
    defaultValues,
    submit: async values => {
      const response = await editAdminEventType(eventType.id, values)
      return response.error
        ? {
            success: false,
            feedback: {
              title: 'Error al editar el tipo de evento',
              description: response.error,
              variant: 'destructive',
            },
          }
        : { success: true, feedback: { title: 'Tipo de evento actualizado.' } }
    },
  })
}
