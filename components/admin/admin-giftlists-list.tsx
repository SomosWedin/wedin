'use client'

import type { Category, EventType, Giftlist } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { IoAdd, IoPencilOutline, IoTrashOutline } from 'react-icons/io5'
import { deleteAdminGiftlist } from '@/actions/data/giftlist'
import GiftlistForm from '@/components/forms/dialog/giftlist'
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
import { useCreateAdminGiftlist } from '@/hooks/dialog/forms/use-create-admin-giftlist'
import { useEditAdminGiftlist } from '@/hooks/dialog/forms/use-edit-admin-giftlist'
import type { useGiftlistFormController } from '@/hooks/dialog/forms/use-giftlist-form-controller'
import { useToast } from '@/hooks/use-toast'

type AdminGiftlist = Giftlist & {
  gifts: Pick<{ id: string; categoryId: string }, 'id' | 'categoryId'>[]
  eventTypes: Pick<EventType, 'id' | 'name'>[]
}

type GiftlistFormController = ReturnType<typeof useGiftlistFormController>

function compatibleEventTypes(giftlist: AdminGiftlist, categories: Category[]) {
  if (giftlist.gifts.length === 0) return []

  const categoriesById = new Map(
    categories.map(category => [category.id, category])
  )
  const giftCategories = giftlist.gifts
    .map(gift => categoriesById.get(gift.categoryId))
    .filter((category): category is Category => Boolean(category))

  if (giftCategories.length !== giftlist.gifts.length) return []

  return giftCategories.reduce(
    (commonIds, category) =>
      commonIds.filter(eventTypeId =>
        category.eventTypeIds.includes(eventTypeId)
      ),
    [...giftCategories[0].eventTypeIds]
  )
}

function GiftlistDialogContent({
  giftlist,
  categories,
  eventTypes,
  controller,
}: {
  giftlist?: AdminGiftlist
  categories: Category[]
  eventTypes: EventType[]
  controller: GiftlistFormController
}) {
  const compatibleTypes = useMemo(() => {
    if (!giftlist) return []

    const compatibleIds = compatibleEventTypes(giftlist, categories)
    return eventTypes.filter(eventType => compatibleIds.includes(eventType.id))
  }, [categories, eventTypes, giftlist])

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {giftlist ? 'Editar colección' : 'Crear colección'}
        </DialogTitle>
      </DialogHeader>
      <GiftlistForm
        form={controller.form}
        eventTypes={compatibleTypes}
        showEventTypes={Boolean(giftlist)}
        loading={controller.loading}
        isValid={controller.isValid}
        submitLabel={giftlist ? 'Guardar cambios' : 'Crear colección'}
        onSubmit={controller.handleSubmit}
        onCancel={() => controller.handleOpenChange(false)}
      />
    </DialogContent>
  )
}

function CreateGiftlistDialog({
  categories,
  eventTypes,
}: {
  categories: Category[]
  eventTypes: EventType[]
}) {
  const controller = useCreateAdminGiftlist()

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="success" className="gap-2">
          Crear colección <IoAdd className="text-xl" />
        </Button>
      </DialogTrigger>
      <GiftlistDialogContent
        categories={categories}
        eventTypes={eventTypes}
        controller={controller}
      />
    </Dialog>
  )
}

function EditGiftlistDialog({
  giftlist,
  categories,
  eventTypes,
}: {
  giftlist: AdminGiftlist
  categories: Category[]
  eventTypes: EventType[]
}) {
  const controller = useEditAdminGiftlist(giftlist)

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Editar ${giftlist.name}`}
          title="Editar colección"
        >
          <IoPencilOutline />
        </Button>
      </DialogTrigger>
      <GiftlistDialogContent
        giftlist={giftlist}
        categories={categories}
        eventTypes={eventTypes}
        controller={controller}
      />
    </Dialog>
  )
}

export default function AdminGiftlistsList({
  giftlists,
  categories,
  eventTypes,
}: {
  giftlists: AdminGiftlist[]
  categories: Category[]
  eventTypes: EventType[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleting, setDeleting] = useState<AdminGiftlist | undefined>()
  const [deletingLoading, setDeletingLoading] = useState(false)

  const remove = async () => {
    if (!deleting) return

    setDeletingLoading(true)
    const response = await deleteAdminGiftlist(deleting.id)
    setDeletingLoading(false)
    if (response.error) {
      toast({
        title: 'No pudimos eliminar la colección',
        description: response.error,
        variant: 'destructive',
      })
      return
    }
    toast({ title: 'Colección eliminada. Sus regalos quedaron sin colección.' })
    setDeleting(undefined)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <CreateGiftlistDialog categories={categories} eventTypes={eventTypes} />
      </div>
      <div className="overflow-hidden rounded-lg bg-white">
        {giftlists.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay colecciones creadas
          </div>
        ) : (
          giftlists.map(giftlist => (
            <div
              key={giftlist.id}
              className="flex items-center justify-between gap-4 border-b px-4 py-3"
            >
              <div>
                <p className="font-medium">{giftlist.name}</p>
                <p className="text-sm text-textTertiary">
                  {giftlist.eventTypes
                    .map(eventType => eventType.name)
                    .join(', ') || 'Sin tipos de evento'}{' '}
                  · {giftlist.gifts.length} regalos
                </p>
              </div>
              <div className="flex gap-2">
                <EditGiftlistDialog
                  giftlist={giftlist}
                  categories={categories}
                  eventTypes={eventTypes}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Eliminar ${giftlist.name}`}
                  onClick={() => setDeleting(giftlist)}
                >
                  <IoTrashOutline />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={open => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar &quot;{deleting?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La colección se eliminará y sus regalos quedarán sin colección.
              Los regalos no se eliminarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingLoading}
              className="bg-destructive text-white hover:bg-destructive/85"
              onClick={() => void remove()}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
