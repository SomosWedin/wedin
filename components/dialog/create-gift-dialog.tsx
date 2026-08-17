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
  eventId: string
  wishlistId: string
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
          categories={categories}
          loading={loading}
          isValid={isValid}
          imagePreview={imagePreview}
          fileInputRef={fileInputRef}
          uploadInputId="create-gift-image-upload"
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
