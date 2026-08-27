'use client'

import type { Category } from '@prisma/client'
import { useState } from 'react'
import { IoAdd, IoPencilOutline } from 'react-icons/io5'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { useCategoryFormController } from '@/hooks/dialog/forms/use-category-form-controller'
import { useCreateAdminCategory } from '@/hooks/dialog/forms/use-create-admin-category'
import { useEditAdminCategory } from '@/hooks/dialog/forms/use-edit-admin-category'
import CategoryForm from '../forms/dialog/category'

type CategoryFormController = ReturnType<typeof useCategoryFormController>

function CategoryDialogContent({
  category,
  controller,
}: {
  category?: Category
  controller: CategoryFormController
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const eventType = controller.form.watch('eventType')
  const eventTypeChanged =
    Boolean(category) && (category?.eventType ?? '') !== eventType

  return (
    <>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Editar categoría' : 'Crear categoría'}
          </DialogTitle>
        </DialogHeader>
        <CategoryForm
          form={controller.form}
          loading={controller.loading}
          isValid={controller.isValid}
          submitLabel={category ? 'Guardar cambios' : 'Crear categoría'}
          onSubmit={event => {
            if (eventTypeChanged) {
              event?.preventDefault()
              setConfirmOpen(true)
              return Promise.resolve()
            }
            return controller.handleSubmit(event)
          }}
          onCancel={() => controller.handleOpenChange(false)}
        />
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar el tipo de evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos los regalos de esta categoría quedarán disponibles para el
              nuevo tipo de evento. Los regalos que ya fueron agregados a listas
              existentes seguirán allí y podrán comprarse normalmente; sus
              pagos, contribuciones y reservas no cambiarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={controller.loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={controller.loading}
              onClick={() => void controller.handleSubmit()}
            >
              Confirmar cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function CreateCategoryDialog() {
  const controller = useCreateAdminCategory()

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="success" className="gap-2">
          Crear categoría
          <IoAdd className="text-2xl" />
        </Button>
      </DialogTrigger>
      <CategoryDialogContent controller={controller} />
    </Dialog>
  )
}

function EditCategoryDialog({ category }: { category: Category }) {
  const controller = useEditAdminCategory(category)

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Editar ${category.name}`}
          title="Editar categoría"
        >
          <IoPencilOutline />
        </Button>
      </DialogTrigger>
      <CategoryDialogContent category={category} controller={controller} />
    </Dialog>
  )
}

export default function AdminCategoryDialog({
  category,
}: {
  category?: Category
}) {
  return category ? (
    <EditCategoryDialog category={category} />
  ) : (
    <CreateCategoryDialog />
  )
}
