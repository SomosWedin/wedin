'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { usePathname, useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { prepareImageForUpload } from '@/lib/image-upload'
import { uploadImage } from '@/lib/image-uploader'
import { GiftFormSchema, type GiftFormValues } from '@/schemas/form'
import { createGiftFlow } from './create-gift-flow'

type UseCreateGiftProps = {
  eventId?: string
  wishlistId?: string
}

export function useCreateGift({ eventId, wishlistId }: UseCreateGiftProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [preparingImage, setPreparingImage] = useState(false)
  const pathname = usePathname()
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<GiftFormValues>({
    resolver: zodResolver(GiftFormSchema),
    mode: 'all',
    defaultValues: {
      name: '',
      categoryId: '',
      price: '',
      isDefault: isAdminRoute,
      eventId,
      imageUrl: '',
      wishlistId,
      isFavoriteGift: false,
      isGroupGift: false,
      quantity: 1,
    },
  })

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

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

  const resetDialog = () => {
    form.reset()
    setImageFile(null)
    setImagePreview(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetDialog()
    }
  }

  const onSubmit: SubmitHandler<GiftFormValues> = async values => {
    setLoading(true)

    try {
      let imageUrl = ''

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

      const result = await createGiftFlow({
        values,
        imageUrl,
        isAdminRoute,
        eventId,
        wishlistId,
      })

      if (result.error) {
        toast({
          title:
            result.step === 'gift'
              ? 'Error al crear el regalo'
              : 'Error al agregar el regalo a tu lista',
          description: result.error,
          variant: 'destructive',
        })

        return
      }

      if (!isAdminRoute) {
        toast({
          title: 'Regalo agregado a tu lista. 🎁',
          action: (
            <ToastAction
              altText="Ver lista"
              onClick={() => router.push('/wishlist')}
            >
              Ver lista
            </ToastAction>
          ),
        })
      }

      handleOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error creating gift:', error)

      toast({
        title: 'No pudimos crear el regalo',
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
