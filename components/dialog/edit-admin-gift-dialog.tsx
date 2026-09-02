'use client'

import type { Category, EventType } from '@prisma/client'
import { useMemo, useState } from 'react'
import { IoPencilOutline } from 'react-icons/io5'
import type { GiftlistOption } from '@/actions/data/giftlist'
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
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import {
  type EditableAdminGift,
  useEditAdminGift,
} from '@/hooks/admin/use-edit-admin-gift'
import { getIncompatibleGiftlistsForCategoryChange } from '@/lib/gift-collection-options'
import GiftFormDialogContent from './gift-form-dialog-content'

type EditAdminGiftDialogProps = {
  gift: EditableAdminGift
  categories: Category[]
  giftlists: GiftlistOption[]
  eventTypes: EventType[]
}

export default function EditAdminGiftDialog({
  gift,
  categories,
  giftlists,
  eventTypes,
}: EditAdminGiftDialogProps) {
  const controller = useEditAdminGift(gift)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const selectedCategoryId = controller.form.watch('categoryId')
  const selectedGiftlistIds = controller.form.watch('giftlistIds')
  const categoryChanged = selectedCategoryId !== gift.categoryId
  const previousCategory = categories.find(
    category => category.id === gift.categoryId
  )
  const nextCategory = categories.find(
    category => category.id === selectedCategoryId
  )
  const eventTypeNameById = useMemo(
    () => new Map(eventTypes.map(eventType => [eventType.id, eventType.name])),
    [eventTypes]
  )
  const incompatibleGiftlists = getIncompatibleGiftlistsForCategoryChange(
    giftlists,
    selectedGiftlistIds,
    gift.id,
    nextCategory
  )

  const formatEventTypes = (eventTypeIds: string[]) =>
    eventTypeIds.length > 0
      ? eventTypeIds
          .map(eventTypeId => eventTypeNameById.get(eventTypeId) ?? eventTypeId)
          .join(', ')
      : 'ningún tipo de evento en común'

  return (
    <>
      <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Editar ${gift.name}`}
            title="Editar regalo"
          >
            <IoPencilOutline />
          </Button>
        </DialogTrigger>

        <GiftFormDialogContent
          title="Editar regalo"
          controller={controller}
          categories={categories}
          eventTypes={eventTypes}
          giftlists={giftlists}
          uploadInputId={`edit-admin-gift-image-${gift.id}`}
          submitLabel="Guardar"
          allowTypeChange
          adminMode
          preserveGiftlistSelectionsOnCategoryChange
          onSubmit={event => {
            if (categoryChanged && incompatibleGiftlists.length > 0) {
              event?.preventDefault()
              setConfirmOpen(true)
              return Promise.resolve()
            }
            return controller.handleSubmit(event)
          }}
        />
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar la categoría?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3 text-left">
                <p>
                  Cambiarás <strong>{gift.name}</strong> de{' '}
                  <strong>
                    {previousCategory?.name ?? 'Categoría anterior'}
                  </strong>{' '}
                  ({formatEventTypes(previousCategory?.eventTypeIds ?? [])}) a{' '}
                  <strong>{nextCategory?.name ?? 'Nueva categoría'}</strong> (
                  {formatEventTypes(nextCategory?.eventTypeIds ?? [])}).
                </p>

                <div>
                  <p>La nueva categoría no coincide con estas colecciones:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {incompatibleGiftlists.map(giftlist => (
                      <li key={giftlist.id}>
                        <strong>{giftlist.name}</strong>: los demás regalos
                        comparten{' '}
                        {formatEventTypes(giftlist.remainingEventTypeIds)}.
                      </li>
                    ))}
                  </ul>
                </div>

                <p>
                  Para mantener el regalo en esas colecciones, cancelá y elegí
                  una categoría que comparta al menos uno de los tipos
                  indicados, o ajustá primero las categorías de los demás
                  regalos. Si continuás, el regalo se quitará de esas
                  colecciones.
                </p>
              </div>
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
              Continuar y guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
