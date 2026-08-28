'use client'

import type { Category, EventType } from '@prisma/client'
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
  eventTypes,
}: {
  category?: Category
  controller: CategoryFormController
  eventTypes: EventType[]
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const eventTypeIds = controller.form.watch('eventTypeIds')
  const eventTypeChanged =
    Boolean(category) &&
    [...(category?.eventTypeIds ?? [])].sort().join(',') !==
      [...eventTypeIds].sort().join(',')

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
          eventTypes={eventTypes}
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
            <AlertDialogTitle>¿Cambiar los tipos de evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto cambia en qué catálogos aparecen todos los regalos de la
              categoría. Los regalos que ya están en listas de deseos seguirán
              allí; sus precios, pagos, contribuciones y reservas no cambiarán.
              No podrás quitar un tipo requerido por una colección asociada.
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

function CreateCategoryDialog({ eventTypes }: { eventTypes: EventType[] }) {
  const controller = useCreateAdminCategory()

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="success" className="gap-2">
          Crear categoría
          <IoAdd className="text-2xl" />
        </Button>
      </DialogTrigger>
      <CategoryDialogContent controller={controller} eventTypes={eventTypes} />
    </Dialog>
  )
}

function EditCategoryDialog({
  category,
  eventTypes,
}: {
  category: Category
  eventTypes: EventType[]
}) {
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
      <CategoryDialogContent
        category={category}
        controller={controller}
        eventTypes={eventTypes}
      />
    </Dialog>
  )
}

export default function AdminCategoryDialog({
  category,
  eventTypes,
}: {
  category?: Category
  eventTypes: EventType[]
}) {
  return category ? (
    <EditCategoryDialog category={category} eventTypes={eventTypes} />
  ) : (
    <CreateCategoryDialog eventTypes={eventTypes} />
  )
}
