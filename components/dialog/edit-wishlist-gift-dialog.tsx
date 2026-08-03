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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  disabled?: boolean
}

export default function EditWishlistGiftDialog({
  wishlistGiftId,
  wishlistId,
  eventId,
  gift,
  categories,
  isFavoriteGift,
  isGroupGift,
  disabled = false,
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
  })

  if (disabled) {
    return (
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button type="button" variant="outline" size="icon" disabled>
                <IoPencilOutline />
              </Button>
            </span>
          </TooltipTrigger>

          <TooltipContent side="top">
            Un regalo con contribuciones no se puede editar
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

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
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
