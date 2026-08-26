'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { usePathname, useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { createGift } from '@/actions/data/gift'
import { createWishlistGift } from '@/actions/data/wishlist-gift'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { prepareImageForUpload } from '@/lib/image-upload'
import { uploadImage } from '@/lib/image-uploader'
import { GiftFormSchema, type GiftFormValues } from '@/schemas/form'

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

      const giftResponse = await createGift({
        ...values,
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

      if (wishlistId && eventId) {
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
