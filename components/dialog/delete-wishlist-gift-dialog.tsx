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
import { useWishlistGift } from '@/hooks/dashboard/use-wishlist-gift'

type DeleteWishlistGiftDialogProps = {
  wishlistId: string
  giftId: string
  giftName: string
}

export default function DeleteWishlistGiftDialog({
  wishlistId,
  giftId,
  giftName,
}: DeleteWishlistGiftDialogProps) {
  const { loading, removeFromWishlist } = useWishlistGift()

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
            ¿Eliminar &quot;{giftName}&quot; de tu lista?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El regalo dejará de estar visible
            para tus invitados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={() => removeFromWishlist({ wishlistId, giftId })}
            className="bg-destructive text-white hover:bg-destructive/85 transition-colors"
          >
            Si, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
