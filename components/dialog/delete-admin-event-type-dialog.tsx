'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IoTrashOutline } from 'react-icons/io5'
import { deleteAdminEventType } from '@/actions/data/event-type'
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

export default function DeleteAdminEventTypeDialog({
  eventTypeId,
  eventTypeName,
}: {
  eventTypeId: string
  eventTypeName: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await deleteAdminEventType(eventTypeId)
      if (response.error) {
        toast({
          title: 'Error al eliminar el tipo de evento',
          description: response.error,
          variant: 'destructive',
        })
        return
      }
      toast({ title: 'Tipo de evento eliminado.' })
      router.refresh()
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
          aria-label={`Eliminar ${eventTypeName}`}
          title="Eliminar tipo de evento"
        >
          <IoTrashOutline />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar &quot;{eventTypeName}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Solo se puede eliminar un tipo de evento que no esté asociado a
            eventos, categorías o colecciones.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={() => void handleDelete()}
            className="bg-destructive text-white hover:bg-destructive/85"
          >
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
