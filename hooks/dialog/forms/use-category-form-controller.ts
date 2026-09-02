'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import type { ToastProps } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { AdminCategorySchema, type AdminCategoryValues } from '@/schemas/form'

type CategoryFormFeedback = {
  title: string
  description?: string
  variant?: ToastProps['variant']
}

type CategoryFormResult =
  | { success: true; feedback?: CategoryFormFeedback }
  | { success: false; feedback: CategoryFormFeedback }

type CategoryFormControllerProps = {
  defaultValues: AdminCategoryValues
  submit: (values: AdminCategoryValues) => Promise<CategoryFormResult>
  unexpectedErrorTitle: string
  errorContext: string
}

export function useCategoryFormController({
  defaultValues,
  submit,
  unexpectedErrorTitle,
  errorContext,
}: CategoryFormControllerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const form = useForm<AdminCategoryValues>({
    resolver: zodResolver(AdminCategorySchema),
    mode: 'all',
    defaultValues,
  })

  const resetDialog = () => form.reset(defaultValues)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    resetDialog()
  }

  const onSubmit: SubmitHandler<AdminCategoryValues> = async values => {
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
