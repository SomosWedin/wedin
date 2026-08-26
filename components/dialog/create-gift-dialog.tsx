'use client'

import type { Category } from '@prisma/client'
import { IoAdd } from 'react-icons/io5'
import GiftForm from '@/components/forms/dialog/gift'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCreateGift } from '@/hooks/dialog/forms/use-create-gift'

type CreateGiftDialogProps = {
  eventId?: string
  wishlistId?: string
  categories: Category[]
}

export default function CreateGiftDialog({
  eventId,
  wishlistId,
  categories,
}: CreateGiftDialogProps) {
  const {
    form,
    open,
    loading,
    imagePreview,
    preparingImage,
    fileInputRef,
    isValid,
    handleFileChange,
    handleOpenChange,
    handleSubmit,
  } = useCreateGift({
    eventId,
    wishlistId,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="success" className="gap-2">
          Crear regalo
          <IoAdd className="text-2xl" />
        </Button>
      </DialogTrigger>

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
          uploadInputId="create-gift-image-upload"
        />
      </DialogContent>
    </Dialog>
  )
}
