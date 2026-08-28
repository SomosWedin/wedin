'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import type { ToastProps } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { AdminEventTypeSchema, type AdminEventTypeValues } from '@/schemas/form'

type EventTypeFormFeedback = {
  title: string
  description?: string
  variant?: ToastProps['variant']
}

type EventTypeFormResult =
  | { success: true; feedback?: EventTypeFormFeedback }
  | { success: false; feedback: EventTypeFormFeedback }

type EventTypeFormControllerProps = {
  defaultValues: AdminEventTypeValues
  submit: (values: AdminEventTypeValues) => Promise<EventTypeFormResult>
}

export function useEventTypeFormController({
  defaultValues,
  submit,
}: EventTypeFormControllerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const form = useForm<AdminEventTypeValues>({
    resolver: zodResolver(AdminEventTypeSchema),
    mode: 'all',
    defaultValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    form.reset(defaultValues)
  }

  const onSubmit: SubmitHandler<AdminEventTypeValues> = async values => {
    setLoading(true)
    try {
      const result = await submit(values)
      if (result.feedback) toast(result.feedback)
      if (!result.success) return

      handleOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error creating admin event type:', error)
      toast({
        title: 'No pudimos crear el tipo de evento',
        description: 'Intentá nuevamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
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
