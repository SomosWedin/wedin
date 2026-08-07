'use client'

import { IoAdd } from 'react-icons/io5'
import CreateGuestForm from '@/components/forms/dialog/create-guest'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCreateGuest } from '@/hooks/dialog/forms/use-create-guest'

type CreateGuestDialogProps = {
  eventId: string
}

export default function CreateGuestDialog({
  eventId,
}: CreateGuestDialogProps) {
  const { form, open, loading, isValid, handleOpenChange, handleSubmit } =
    useCreateGuest({ eventId })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="success" className="gap-2">
          Agregar invitado
          <IoAdd className="text-2xl" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar invitado</DialogTitle>
        </DialogHeader>

        <CreateGuestForm
          form={form}
          loading={loading}
          isValid={isValid}
          onSubmit={handleSubmit}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
