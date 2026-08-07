'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { useGuest } from '@/hooks/dashboard/use-guest'
import { GuestCreateSchema } from '@/schemas/form'

export type CreateGuestFormValues = z.infer<typeof GuestCreateSchema>

type UseCreateGuestProps = {
  eventId: string
}

export function useCreateGuest({ eventId }: UseCreateGuestProps) {
  const [open, setOpen] = useState(false)
  const { loading, addGuest } = useGuest()

  const form = useForm<CreateGuestFormValues>({
    resolver: zodResolver(GuestCreateSchema),
    mode: 'all',
    defaultValues: {
      eventId,
      name: '',
      phone: '',
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      form.reset()
    }
  }

  const onSubmit: SubmitHandler<CreateGuestFormValues> = async values => {
    const response = await addGuest(values)

    if (!response.error) {
      handleOpenChange(false)
    }
  }

  return {
    form,
    open,
    loading,
    isValid: form.formState.isValid,
    handleOpenChange,
    handleSubmit: form.handleSubmit(onSubmit),
  }
}
