'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IoTrashOutline } from 'react-icons/io5'
import { deleteDefaultGiftAsAdmin } from '@/actions/data/gift'
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
import { useToast } from '@/hooks/use-toast'

type DeleteAdminGiftDialogProps = {
  giftId: string
  giftName: string
}

export default function DeleteAdminGiftDialog({
  giftId,
  giftName,
}: DeleteAdminGiftDialogProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    setLoading(true)

    try {
      const response = await deleteDefaultGiftAsAdmin(giftId)

      if (response.error) {
        toast({
          title: 'Error al eliminar el regalo',
          description: response.error,
          variant: 'destructive',
        })
        return
      }

      toast({ title: 'Regalo eliminado de la lista.' })
      router.refresh()
    } catch (error) {
      console.error('Error deleting admin gift:', error)
      toast({
        title: 'No pudimos eliminar el regalo',
        description: 'Intentá nuevamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Eliminar ${giftName}`}
          title="Eliminar regalo"
        >
          <IoTrashOutline />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar &quot;{giftName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Ya no aparecerá como opción para nuevas listas. Si alguna pareja ya
            lo agregó, conservará el regalo en su lista.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={handleDelete}
            className="bg-destructive text-white transition-colors hover:bg-destructive/85"
          >
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
