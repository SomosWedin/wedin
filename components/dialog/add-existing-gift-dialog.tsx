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
  ExistingGift,
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
          categories={categories}
          loading={loading}
          isValid={isValid}
          imagePreview={imagePreview}
          fileInputRef={fileInputRef}
          uploadInputId={`existing-gift-image-${gift.id}`}
          submitLabel="Agregar a la lista"
          allowTypeChange
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
