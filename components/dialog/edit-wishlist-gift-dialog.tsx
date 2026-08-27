'use client'

import type { Category } from '@prisma/client'
import { IoPencilOutline } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import {
  type EditableGift,
  useEditWishlistGift,
} from '@/hooks/dialog/forms/use-edit-wishlist-gift'
import GiftFormDialogContent from './gift-form-dialog-content'

type EditWishlistGiftDialogProps = {
  wishlistGiftId: string
  wishlistId: string
  eventId: string
  gift: EditableGift
  categories: Category[]
  isFavoriteGift: boolean
  isGroupGift: boolean
  quantity: number
  minQuantity: number
  lockPrice: boolean
  allowTypeChange: boolean
}

export default function EditWishlistGiftDialog({
  wishlistGiftId,
  wishlistId,
  eventId,
  gift,
  categories,
  isFavoriteGift,
  isGroupGift,
  quantity,
  minQuantity,
  lockPrice,
  allowTypeChange,
}: EditWishlistGiftDialogProps) {
  const controller = useEditWishlistGift({
    wishlistGiftId,
    wishlistId,
    eventId,
    gift,
    isFavoriteGift,
    isGroupGift,
    quantity,
  })

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon">
          <IoPencilOutline />
        </Button>
      </DialogTrigger>

      <GiftFormDialogContent
        title="Editar regalo"
        controller={controller}
        categories={categories}
        uploadInputId={`edit-gift-image-${wishlistGiftId}`}
        submitLabel="Guardar"
        minQuantity={minQuantity}
        lockPrice={lockPrice}
        allowTypeChange={allowTypeChange}
      />
    </Dialog>
  )
}
