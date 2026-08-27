'use client'

import type { Category } from '@prisma/client'
import { IoAdd } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { useCreateGift } from '@/hooks/dialog/forms/use-create-gift'
import GiftFormDialogContent from './gift-form-dialog-content'

type CreateGiftDialogProps =
  | {
    mode: 'admin'
    categories: Category[]
  }
  | {
    mode: 'wishlist'
    eventId: string
    wishlistId: string
    categories: Category[]
  }

export default function CreateGiftDialog(props: CreateGiftDialogProps) {
  const controller = useCreateGift(
    props.mode === 'admin'
      ? { mode: 'admin' }
      : {
        mode: 'wishlist',
        eventId: props.eventId,
        wishlistId: props.wishlistId,
      }
  )

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="success" className="gap-2">
          Crear regalo
          <IoAdd className="text-2xl" />
        </Button>
      </DialogTrigger>

      <GiftFormDialogContent
        title="Agregar regalo"
        controller={controller}
        categories={props.categories}
        uploadInputId="create-gift-image-upload"
        submitLabel={
          props.mode === 'admin' ? 'Crear regalo' : 'Agregar a la lista'
        }
        allowTypeChange
        adminMode={props.mode === 'admin'}
      />
    </Dialog>
  )
}
