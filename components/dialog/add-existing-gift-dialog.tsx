'use client'

import type { Category } from '@prisma/client'
import GiftForm from '@/components/forms/dialog/gift'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type ExistingGift,
  useAddExistingGift,
} from '@/hooks/dialog/forms/use-add-existing-gift'

type AddExistingGiftDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gift: ExistingGift
  eventId: string
  wishlistId: string
  categories: Category[]
}

export default function AddExistingGiftDialog({
  open,
  onOpenChange,
  gift,
  eventId,
  wishlistId,
  categories,
}: AddExistingGiftDialogProps) {
  const {
    form,
    loading,
    imagePreview,
    preparingImage,
    fileInputRef,
    isValid,
    handleFileChange,
    handleOpenChange,
    handleSubmit,
  } = useAddExistingGift({
    gift,
    eventId,
    wishlistId,
    onOpenChange,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar regalo</DialogTitle>
        </DialogHeader>

        <GiftForm
          form={form}
          allowTypeChange
          categories={categories}
          fileInputRef={fileInputRef}
          imagePreview={imagePreview}
          isValid={isValid}
          loading={loading}
          onCancel={() => handleOpenChange(false)}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          preparingImage={preparingImage}
          submitLabel="Agregar a la lista"
          uploadInputId={`existing-gift-image-${gift.id}`}
        />
      </DialogContent>
    </Dialog>
  )
}
