'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Gift, Image as ImageModel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { createGift, editGift } from '@/actions/data/gift'
import { editWishlistGift } from '@/actions/data/wishlist-gift'
import type { GiftFormValues } from '@/components/forms/dialog/gift'
import { useToast } from '@/hooks/use-toast'
import { uploadGiftImageToAws } from '@/lib/s3'
import { GiftFormSchema } from '@/schemas/form'

export type EditableGift = Gift & {
  image: ImageModel | null
}

type UseEditWishlistGiftProps = {
  wishlistGiftId: string
  wishlistId: string
  eventId: string
  gift: EditableGift
  isFavoriteGift: boolean
  isGroupGift: boolean
  quantity: number
}

export function useEditWishlistGift({
  wishlistGiftId,
  wishlistId,
  eventId,
  gift,
  isFavoriteGift,
  isGroupGift,
  quantity,
}: UseEditWishlistGiftProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    gift.image?.url ?? null
  )

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
      isEditedVersion: false,
      sourceGiftId: gift.id,
      eventId,
      imageUrl: gift.image?.url ?? '',
      wishlistId,
      isFavoriteGift,
      isGroupGift,
      quantity,
    },
  })

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const resetForm = () => {
    form.reset({
      name: gift.name,
      categoryId: gift.categoryId,
      price: gift.price,
      isDefault: false,
      isEditedVersion: false,
      sourceGiftId: gift.id,
      eventId,
      imageUrl: gift.image?.url ?? '',
      wishlistId,
      isFavoriteGift,
      isGroupGift,
      quantity,
    })
    setImageFile(null)
    setImagePreview(gift.image?.url ?? null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    resetForm()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    event.target.value = ''
  }

  const onSubmit: SubmitHandler<GiftFormValues> = async values => {
    setLoading(true)

    try {
      const hasGiftChanges =
        values.name !== gift.name ||
        values.categoryId !== gift.categoryId ||
        values.price !== gift.price ||
        imageFile !== null

      let giftId = gift.id

      if (hasGiftChanges) {
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

        if (gift.isDefault) {
          const giftResponse = await createGift(
            {
              ...values,
              isDefault: false,
              isEditedVersion: true,
              sourceGiftId: gift.id,
              imageUrl,
            },
            wishlistGiftId
          )

          if (giftResponse.error || !giftResponse.giftId) {
            toast({
              title: 'Error al guardar los cambios del regalo',
              description: giftResponse.error,
              variant: 'destructive',
            })

            return
          }

          giftId = giftResponse.giftId
        } else {
          const editResponse = await editGift(
            {
              ...values,
              imageUrl,
            },
            gift.id,
            wishlistGiftId
          )

          if (editResponse.error) {
            toast({
              title: 'Error al guardar los cambios del regalo',
              description: editResponse.error,
              variant: 'destructive',
            })

            return
          }
        }
      }

      const response = await editWishlistGift({
        wishlistGiftId,
        wishlistId,
        giftId,
        isFavoriteGift: values.isFavoriteGift,
        isGroupGift: values.isGroupGift,
        quantity: values.quantity,
      })

      if (response.error) {
        toast({
          title: 'Error al editar el regalo',
          description: response.error,
          variant: 'destructive',
        })

        return
      }

      toast({
        title: 'Regalo actualizado. ✅',
      })

      handleOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error editing wishlist gift:', error)

      toast({
        title: 'No pudimos editar el regalo',
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
