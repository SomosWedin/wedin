'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Event, EventType, User } from '@prisma/client'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
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

    try {
      await updateEvent(id, { date: values.eventDate, url: values.eventUrl })
      await updateUserById(currentUser.id, values.name, values.lastName)
      if (
        partnerId &&
        values.partnerName &&
        values.partnerLastName &&
        values.partnerEmail
      ) {
        await updateUserById(
          partnerId,
          values.partnerName,
          values.partnerLastName,
          values.partnerEmail
        )
      }
    } catch (error) {
      console.error('Error updating event and user data:', error)
      return
    }

    toast({
      title: 'El evento y usuario se actualizó con éxito. 📅',
    })
    setLoading(false)
  }

  return {
    loading,
    form,
    isDirty,
    isValid,
    onSubmit,
  }
}
