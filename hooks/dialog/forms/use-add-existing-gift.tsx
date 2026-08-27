'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Gift, Image as ImageModel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { createGift } from '@/actions/data/gift'
import { createWishlistGift } from '@/actions/data/wishlist-gift'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { prepareImageForUpload } from '@/lib/image-upload'
import { uploadImage } from '@/lib/image-uploader'
import { GiftFormSchema, type GiftFormValues } from '@/schemas/form'

export type ExistingGift = Gift & {
  image: ImageModel | null
}

type UseAddExistingGiftProps = {
  gift: ExistingGift
  eventId: string
  wishlistId: string
  onOpenChange: (open: boolean) => void
}

export function useAddExistingGift({
  gift,
  eventId,
  wishlistId,
  onOpenChange,
}: UseAddExistingGiftProps) {
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    gift.image?.url ?? null
  )
  const [preparingImage, setPreparingImage] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<GiftFormValues>({
    resolver: zodResolver(GiftFormSchema),
    mode: 'all',
    defaultValues: {
      name: gift.name,
      categoryId: gift.categoryId,
      price: gift.price,
      isDefault: false,
      eventId,
      imageUrl: gift.image?.url ?? '',
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
    setImagePreview(gift.image?.url ?? null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      resetDialog()
    }
  }

  const onSubmit: SubmitHandler<GiftFormValues> = async values => {
    setLoading(true)

    try {
      const hasChanges =
        values.name !== gift.name ||
        values.categoryId !== gift.categoryId ||
        values.price !== gift.price ||
        imageFile !== null

      let giftId = gift.id

      if (hasChanges) {
        let imageUrl = gift.image?.url ?? ''

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
          isDefault: false,
          imageUrl,
        })

        if (giftResponse.error || !giftResponse.giftId) {
          toast({
            title: 'Error al guardar los cambios del regalo',
            description: giftResponse.error,
            variant: 'destructive',
          })

          return
        }

        giftId = giftResponse.giftId
      }

      const linkResponse = await createWishlistGift({
        wishlistId,
        eventId,
        giftId,
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
      console.error('Error adding existing gift:', error)

      toast({
        title: 'No pudimos agregar el regalo',
        description: 'Intentá nuevamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    form,
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
