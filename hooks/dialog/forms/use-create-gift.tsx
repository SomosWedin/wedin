'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { createGift } from '@/actions/data/gift'
import { createWishlistGift } from '@/actions/data/wishlist-gift'
import type { GiftFormValues } from '@/components/forms/dialog/gift'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { uploadGiftImageToAws } from '@/lib/s3'
import { GiftFormSchema } from '@/schemas/form'

type UseCreateGiftProps = {
  eventId: string
  wishlistId: string
}

export function useCreateGift({ eventId, wishlistId }: UseCreateGiftProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

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
      isDefault: false,
      isEditedVersion: false,
      sourceGiftId: '',
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    event.target.value = ''
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
        const uploadResponse = await uploadGiftImageToAws({
          file: imageFile,
          eventId,
        })

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

      const giftResponse = await createGift({
        ...values,
        isDefault: false,
        isEditedVersion: false,
        imageUrl,
      })

      if (giftResponse.error || !giftResponse.giftId) {
        toast({
          title: 'Error al crear el regalo',
          description: giftResponse.error,
          variant: 'destructive',
        })

        return
      }

      const linkResponse = await createWishlistGift({
        wishlistId,
        eventId,
        giftId: giftResponse.giftId,
        isFavoriteGift: values.isFavoriteGift,
        isGroupGift: values.isGroupGift,
        quantity: values.quantity,
      })

      if (linkResponse.error) {
        toast({
          title: 'Error al agregar el regalo a tu lista',
          description: linkResponse.error,
          variant: 'destructive',
        })

        return
      }

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
    fileInputRef,
    isValid: form.formState.isValid,
    handleFileChange,
    handleOpenChange,
    handleSubmit: form.handleSubmit(onSubmit),
  }
}
