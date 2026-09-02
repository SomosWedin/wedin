'use client'

import type { Category } from '@prisma/client'
import { Dialog } from '@/components/ui/dialog'
import {
  type ExistingGift,
  useAddExistingGift,
} from '@/hooks/dialog/forms/use-add-existing-gift'
import GiftFormDialogContent from './gift-form-dialog-content'

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
  const controller = useAddExistingGift({
    gift,
    eventId,
    wishlistId,
    open,
    onOpenChange,
  })

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <GiftFormDialogContent
        title="Agregar regalo"
        controller={controller}
        categories={categories}
        uploadInputId={`existing-gift-image-${gift.id}`}
        submitLabel="Agregar a la lista"
        allowTypeChange
      />
    </Dialog>
  )
}
