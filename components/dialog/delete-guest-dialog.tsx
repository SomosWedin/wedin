'use client'

import { IoTrashOutline } from 'react-icons/io5'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useGuest } from '@/hooks/dashboard/use-guest'

type DeleteGuestDialogProps = {
  guestId: string
  guestName: string
}

export default function DeleteGuestDialog({
  guestId,
  guestName,
}: DeleteGuestDialogProps) {
  const { removeGuest } = useGuest()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="icon">
          <IoTrashOutline />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar a &quot;{guestName}&quot; de tu lista?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => removeGuest({ guestId })}
            className="bg-destructive text-white hover:bg-destructive/85 transition-colors"
          >
            Si, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
