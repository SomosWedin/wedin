'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import type { ToastProps } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { AdminGiftlistSchema, type AdminGiftlistValues } from '@/schemas/form'

type GiftlistFormFeedback = {
  title: string
  description?: string
  variant?: ToastProps['variant']
}

type GiftlistFormResult =
  | { success: true; feedback?: GiftlistFormFeedback }
  | { success: false; feedback: GiftlistFormFeedback }

type GiftlistFormControllerProps = {
  defaultValues: AdminGiftlistValues
  submit: (values: AdminGiftlistValues) => Promise<GiftlistFormResult>
  unexpectedErrorTitle: string
  errorContext: string
}

export function useGiftlistFormController({
  defaultValues,
  submit,
  unexpectedErrorTitle,
  errorContext,
}: GiftlistFormControllerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const form = useForm<AdminGiftlistValues>({
    resolver: zodResolver(AdminGiftlistSchema),
    mode: 'all',
    defaultValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    form.reset(defaultValues)
  }

  const onSubmit: SubmitHandler<AdminGiftlistValues> = async values => {
    setLoading(true)
    try {
      const result = await submit(values)
      if (!result.success) {
        toast(result.feedback)
        return
      }

      if (result.feedback) toast(result.feedback)
      handleOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error(errorContext, error)
      toast({
        title: unexpectedErrorTitle,
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
