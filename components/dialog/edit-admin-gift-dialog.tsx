'use client'

import type { Category, EventType } from '@prisma/client'
import { IoPencilOutline } from 'react-icons/io5'
import type { GiftlistOption } from '@/actions/data/giftlist'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import {
  type EditableAdminGift,
  useEditAdminGift,
} from '@/hooks/admin/use-edit-admin-gift'
import GiftFormDialogContent from './gift-form-dialog-content'

type EditAdminGiftDialogProps = {
  gift: EditableAdminGift
  categories: Category[]
  giftlists: GiftlistOption[]
  eventTypes: EventType[]
}

export default function EditAdminGiftDialog({
  gift,
  categories,
  giftlists,
  eventTypes,
}: EditAdminGiftDialogProps) {
  const controller = useEditAdminGift(gift)

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Editar ${gift.name}`}
          title="Editar regalo"
        >
          <IoPencilOutline />
        </Button>
      </DialogTrigger>

      <GiftFormDialogContent
        title="Editar regalo"
        controller={controller}
        categories={categories}
        eventTypes={eventTypes}
        giftlists={giftlists}
        uploadInputId={`edit-admin-gift-image-${gift.id}`}
        submitLabel="Guardar"
        allowTypeChange
        adminMode
      />
    </Dialog>
  )
}
