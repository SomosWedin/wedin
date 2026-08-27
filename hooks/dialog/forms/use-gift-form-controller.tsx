'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Gift, Image as ImageModel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import type { ToastActionElement, ToastProps } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { prepareImageForUpload } from '@/lib/image-upload'
import { uploadImage } from '@/lib/image-uploader'
import { GiftFormSchema, type GiftFormValues } from '@/schemas/form'

export type GiftWithImage = Gift & {
  image: ImageModel | null
}

type GiftFormFeedback = {
  title: string
  description?: string
  variant?: ToastProps['variant']
  action?: ToastActionElement
}

type GiftFormSubmissionResult =
  | { success: true; feedback?: GiftFormFeedback }
  | { success: false; feedback: GiftFormFeedback }

type GiftFormSubmissionContext = {
  values: GiftFormValues
  imageUrl: string
  hasNewImage: boolean
}

type UseGiftFormControllerProps = {
  defaultValues: GiftFormValues
  initialImageUrl?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  submit: (
    context: GiftFormSubmissionContext
  ) => Promise<GiftFormSubmissionResult>
  unexpectedErrorTitle: string
  errorContext: string
}

export function useGiftFormController({
  defaultValues,
  initialImageUrl = null,
  open: controlledOpen,
  onOpenChange,
  submit,
  unexpectedErrorTitle,
  errorContext,
}: UseGiftFormControllerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialImageUrl
  )
  const [preparingImage, setPreparingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<GiftFormValues>({
    resolver: zodResolver(GiftFormSchema),
    mode: 'all',
    defaultValues,
  })
  const { reset } = form

  const open = controlledOpen ?? internalOpen

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const resetDialog = () => {
    reset(defaultValues)
    setImageFile(null)
    setImagePreview(initialImageUrl)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)

    if (!nextOpen) resetDialog()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setPreparingImage(true)
    const prepared = await prepareImageForUpload(file)
    setPreparingImage(false)

    if (!prepared.ok) {
      toast({
        title: 'No pudimos usar esa imagen',
        description: `${file.name}: ${prepared.message}`,
        variant: 'destructive',
      })
      return
    }

    setImageFile(prepared.file)
    setImagePreview(URL.createObjectURL(prepared.file))
  }

  const onSubmit: SubmitHandler<GiftFormValues> = async values => {
    setLoading(true)

    try {
      let imageUrl = initialImageUrl ?? ''

      if (imageFile) {
        const uploadResponse = await uploadImage(imageFile)

        if (uploadResponse.error || !uploadResponse.url) {
          toast({
            title: 'Error al subir la imagen',
            description: uploadResponse.error,
            variant: 'destructive',
          })
          return
        }

        imageUrl = uploadResponse.url
      }

      const result = await submit({
        values,
        imageUrl,
        hasNewImage: imageFile !== null,
      })

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
    imagePreview,
    preparingImage,
    fileInputRef,
    isValid: form.formState.isValid,
    handleFileChange,
    handleOpenChange,
    handleSubmit: form.handleSubmit(onSubmit),
  }
}

export type GiftFormController = ReturnType<typeof useGiftFormController>
