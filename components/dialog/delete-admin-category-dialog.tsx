'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IoTrashOutline } from 'react-icons/io5'
import { deleteAdminCategory } from '@/actions/data/category'
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

export default function DeleteAdminCategoryDialog({
  categoryId,
  categoryName,
}: {
  categoryId: string
  categoryName: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await deleteAdminCategory(categoryId)
      if (response.error) {
        toast({
          title: 'Error al eliminar la categoría',
          description: response.error,
          variant: 'destructive',
        })
        return
      }
      toast({ title: 'Categoría eliminada.' })
      router.refresh()
    } catch (error) {
      console.error('Error deleting admin category:', error)
      toast({
        title: 'No pudimos eliminar la categoría',
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
          aria-label={`Eliminar ${categoryName}`}
          title="Eliminar categoría"
        >
          <IoTrashOutline />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar &quot;{categoryName}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Solo se puede eliminar una categoría que no tenga regalos ni
            colecciones asociadas.
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
