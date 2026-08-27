'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { type Event, EventType, type User } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { updateEvent } from '@/actions/data/event'
import { updateUserById } from '@/actions/data/user'
import { useToast } from '@/hooks/use-toast'
import { UpdateEventSettingsFormSchema } from '@/schemas/form'

type UseUpdateEventAndUserDataProps = {
  event: Event
  currentUser: User
  secondaryEventUser?: User | null
}

export function useUpdateEventSettings({
  event,
  currentUser,
  secondaryEventUser,
}: UseUpdateEventAndUserDataProps) {
  const [loading, setLoading] = useState(false)
  const { name, lastName } = currentUser
  const { id, date, eventType, url } = event
  const {
    id: partnerId,
    name: partnerName,
    lastName: partnerLastName,
    email: partnerEmail,
  } = secondaryEventUser || {}
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<z.infer<typeof UpdateEventSettingsFormSchema>>({
    resolver: zodResolver(UpdateEventSettingsFormSchema),
    mode: 'all',
    defaultValues: {
      eventDate: date || undefined,
      eventType: eventType,
      eventUrl: url || undefined,
      name: name || '',
      lastName: lastName || '',
      partnerName: eventType === EventType.WEDDING ? partnerName || '' : null,
      partnerLastName:
        eventType === EventType.WEDDING ? partnerLastName || '' : null,
      partnerEmail: eventType === EventType.WEDDING ? partnerEmail || '' : null,
    },
  })
  const { isDirty, isValid } = form.formState

  const onSubmit: SubmitHandler<
    z.infer<typeof UpdateEventSettingsFormSchema>
  > = async values => {
    setLoading(true)

    const validatedFields = UpdateEventSettingsFormSchema.safeParse(values)

    if (!validatedFields.success) {
      console.error(validatedFields.error.errors)
      toast({
        title: 'Error en los campos del formulario',
        description: validatedFields.error.errors
          .map(err => err.message)
          .join(', '),
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const showError = (description: string) => {
      toast({
        title: 'No pudimos guardar los cambios',
        description,
        variant: 'destructive',
      })
      setLoading(false)
    }

    try {
      const updatedEvent = await updateEvent(id, {
        date: values.eventDate,
        url: values.eventUrl,
      })

      if (updatedEvent.error) {
        showError(updatedEvent.error)
        return
      }

      const updatedUser = await updateUserById(
        currentUser.id,
        values.name,
        values.lastName
      )

      if (updatedUser.error) {
        showError(updatedUser.error)
        return
      }

      if (partnerId && values.partnerName && values.partnerLastName) {
        const updatedPartner = await updateUserById(
          partnerId,
          values.partnerName,
          values.partnerLastName,
          values.partnerEmail || undefined
        )

        if (updatedPartner.error) {
          showError(updatedPartner.error)
          return
        }
      }
    } catch (error) {
      console.error('Error updating event and user data:', error)
      showError('Volvé a intentarlo en unos minutos.')
      return
    }

    form.reset(values)

    toast({
      title: 'El evento y usuario se actualizó con éxito. 📅',
    })
    setLoading(false)

    router.refresh()
  }

  const onInvalid = () => {
    const messages = Object.values(form.formState.errors)
      .map(error => error?.message)
      .filter((message): message is string => Boolean(message))

    toast({
      title: 'Revisá los campos del formulario',
      description: messages.join(', '),
      variant: 'destructive',
    })
  }

  return {
    loading,
    form,
    isDirty,
    isValid,
    onSubmit,
    onInvalid,
  }
}
