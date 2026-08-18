'use client'

import type { Category } from '@prisma/client'
import { IoPencilOutline } from 'react-icons/io5'
import GiftForm from '@/components/forms/dialog/gift'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  type EditableGift,
  useEditWishlistGift,
} from '@/hooks/dialog/forms/use-edit-wishlist'

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
  const {
    form,
    open,
    loading,
    imagePreview,
    fileInputRef,
    isValid,
    handleFileChange,
    handleOpenChange,
    handleSubmit,
  } = useEditWishlistGift({
    wishlistGiftId,
    wishlistId,
    eventId,
    gift,
    isFavoriteGift,
    isGroupGift,
    quantity,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon">
          <IoPencilOutline />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar regalo</DialogTitle>
        </DialogHeader>

        <GiftForm
          form={form}
          categories={categories}
          loading={loading}
          isValid={isValid}
          imagePreview={imagePreview}
          fileInputRef={fileInputRef}
          uploadInputId={`edit-gift-image-${wishlistGiftId}`}
          submitLabel="Guardar"
          minQuantity={minQuantity}
          lockPrice={lockPrice}
          allowTypeChange={allowTypeChange}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
