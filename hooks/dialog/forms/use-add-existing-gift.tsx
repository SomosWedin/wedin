'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Gift, Image as ImageModel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { createGift } from '@/actions/data/gift'
import { createWishlistGift } from '@/actions/data/wishlist-gift'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { uploadGiftImageToAws } from '@/lib/s3'
import { GiftFormSchema } from '@/schemas/form'

export type ExistingGift = Gift & {
  image: ImageModel | null
}

export type ExistingGiftFormValues = z.infer<typeof GiftFormSchema>

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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<ExistingGiftFormValues>({
    resolver: zodResolver(GiftFormSchema),
    mode: 'all',
    defaultValues: {
      name: gift.name,
      categoryId: gift.categoryId,
      price: gift.price,
      isDefault: false,
      isEditedVersion: false,
      sourceGiftId: gift.id,
      eventId,
      imageUrl: gift.image?.url ?? '',
      wishlistId,
      isFavoriteGift: false,
      isGroupGift: false,
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
    setImagePreview(gift.image?.url ?? null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      resetDialog()
    }
  }

  const onSubmit: SubmitHandler<ExistingGiftFormValues> = async values => {
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
          isEditedVersion: true,
          sourceGiftId: gift.id,
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
    fileInputRef,
    isValid: form.formState.isValid,
    handleFileChange,
    handleOpenChange,
    handleSubmit: form.handleSubmit(onSubmit),
  }
}
