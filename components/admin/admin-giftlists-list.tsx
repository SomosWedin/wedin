'use client'

import type { Category, EventType, Gift } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  IoAdd,
  IoChevronDown,
  IoChevronUp,
  IoPencilOutline,
  IoSearchOutline,
  IoSwapVerticalOutline,
  IoTrashOutline,
} from 'react-icons/io5'
import {
  type AdminGiftlist,
  deleteAdminGiftlist,
} from '@/actions/data/giftlist'
import type { GiftMultiSelectOption } from '@/components/forms/common/gift-multi-select'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateAdminGiftlist } from '@/hooks/dialog/forms/use-create-admin-giftlist'
import { useEditAdminGiftlist } from '@/hooks/dialog/forms/use-edit-admin-giftlist'
import type { useGiftlistFormController } from '@/hooks/dialog/forms/use-giftlist-form-controller'
import { useToast } from '@/hooks/use-toast'

type GiftlistFormController = ReturnType<typeof useGiftlistFormController>
type SortColumn = 'name' | 'eventTypes' | 'categories'
type SortDirection = 'asc' | 'desc'

function SortIcon({
  column,
  activeColumn,
  direction,
}: {
  column: SortColumn
  activeColumn: SortColumn
  direction: SortDirection
}) {
  if (column !== activeColumn) {
    return <IoSwapVerticalOutline className="text-gray-400" />
  }

  return direction === 'asc' ? <IoChevronUp /> : <IoChevronDown />
}

function GiftlistDialogContent({
  giftlist,
  gifts,
  eventTypes,
  controller,
}: {
  giftlist?: AdminGiftlist
  gifts: GiftMultiSelectOption[]
  eventTypes?: EventType[]
  controller: GiftlistFormController
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {giftlist ? 'Editar colección' : 'Crear colección'}
        </DialogTitle>
      </DialogHeader>
      <GiftlistForm
        form={controller.form}
        gifts={gifts}
        loading={controller.loading}
        isValid={controller.isValid}
        submitLabel={giftlist ? 'Guardar cambios' : 'Crear colección'}
        eventTypes={eventTypes}
        filterGiftsByEventType
        initialEventTypeIds={giftlist?.eventTypeIds}
        onSubmit={controller.handleSubmit}
        onCancel={() => controller.handleOpenChange(false)}
      />
    </DialogContent>
  )
}

function CreateGiftlistDialog({
  gifts,
  eventTypes,
}: {
  gifts: GiftMultiSelectOption[]
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
        gifts={gifts}
        eventTypes={eventTypes}
        controller={controller}
      />
    </Dialog>
  )
}

function EditGiftlistDialog({
  giftlist,
  gifts,
  eventTypes,
}: {
  giftlist: AdminGiftlist
  gifts: GiftMultiSelectOption[]
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
        gifts={gifts}
        eventTypes={eventTypes}
        controller={controller}
      />
    </Dialog>
  )
}

export default function AdminGiftlistsList({
  giftlists,
  gifts,
  categories,
  eventTypes,
}: {
  giftlists: AdminGiftlist[]
  gifts: Pick<Gift, 'id' | 'name' | 'categoryId'>[]
  categories: Category[]
  eventTypes: EventType[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleting, setDeleting] = useState<AdminGiftlist | undefined>()
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const categoriesById = useMemo(
    () => new Map(categories.map(category => [category.id, category.name])),
    [categories]
  )
  const categoryEventTypeIdsById = useMemo(
    () =>
      new Map(categories.map(category => [category.id, category.eventTypeIds])),
    [categories]
  )
  const giftOptions = useMemo(
    () =>
      gifts.map(gift => ({
        id: gift.id,
        name: gift.name,
        categoryName:
          categoriesById.get(gift.categoryId) ?? 'Categoría no encontrada',
        eventTypeIds: categoryEventTypeIdsById.get(gift.categoryId) ?? [],
      })),
    [categoriesById, categoryEventTypeIdsById, gifts]
  )

  const getCategoryNames = (giftlist: AdminGiftlist) =>
    Array.from(
      new Set(
        giftlist.gifts
          .map(gift => categoriesById.get(gift.categoryId))
          .filter((name): name is string => Boolean(name))
      )
    ).sort((left, right) => left.localeCompare(right, 'es'))

  const normalizedNameFilter = nameFilter.trim().toLocaleLowerCase('es-PY')
  const filteredGiftlists = giftlists.filter(giftlist => {
    const matchesName = giftlist.name
      .toLocaleLowerCase('es-PY')
      .includes(normalizedNameFilter)
    const matchesEventType =
      eventTypeFilter === 'all' ||
      giftlist.eventTypeIds.includes(eventTypeFilter)
    const matchesCategory =
      categoryFilter === 'all' ||
      giftlist.gifts.some(gift => gift.categoryId === categoryFilter)

    return matchesName && matchesEventType && matchesCategory
  })
  const sortedGiftlists = [...filteredGiftlists].sort((first, second) => {
    const getSortValue = (giftlist: AdminGiftlist) => {
      if (sortColumn === 'name') return giftlist.name
      if (sortColumn === 'eventTypes') {
        return giftlist.eventTypes
          .map(eventType => eventType.name)
          .sort((left, right) => left.localeCompare(right, 'es'))
          .join(', ')
      }
      return getCategoryNames(giftlist).join(', ')
    }
    const firstValue = getSortValue(first)
    const secondValue = getSortValue(second)

    if (!firstValue && secondValue) return 1
    if (firstValue && !secondValue) return -1

    const comparison = firstValue.localeCompare(secondValue, 'es', {
      sensitivity: 'base',
    })
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (column: SortColumn) => {
    if (column !== sortColumn) {
      setSortColumn(column)
      setSortDirection('asc')
      return
    }

    setSortDirection(direction => (direction === 'asc' ? 'desc' : 'asc'))
  }

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
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-[200px] flex-1">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            aria-label="Buscar colección por nombre"
            placeholder="Buscar por nombre"
            className="pl-10"
            value={nameFilter}
            onChange={event => setNameFilter(event.target.value)}
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger
            aria-label="Filtrar colecciones por tipo de evento"
            className="bg-white sm:w-56"
          >
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Todos los tipos de evento</SelectItem>
            {eventTypes.map(eventType => (
              <SelectItem key={eventType.id} value={eventType.id}>
                {eventType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger
            aria-label="Filtrar colecciones por categoría"
            className="bg-white sm:w-56"
          >
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CreateGiftlistDialog gifts={giftOptions} eventTypes={eventTypes} />
      </div>
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="hidden grid-cols-12 gap-4 rounded-t-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 sm:grid">
          <button
            type="button"
            className="col-span-3 flex items-center gap-2 text-left hover:text-textPrimary"
            onClick={() => handleSort('name')}
          >
            Nombre de colección
            <SortIcon
              column="name"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <div className="col-span-2">Número de regalos</div>
          <button
            type="button"
            className="col-span-2 flex items-center gap-2 text-left hover:text-textPrimary"
            onClick={() => handleSort('eventTypes')}
          >
            Tipos de evento
            <SortIcon
              column="eventTypes"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <button
            type="button"
            className="col-span-3 flex items-center gap-2 text-left hover:text-textPrimary"
            onClick={() => handleSort('categories')}
          >
            Categorías
            <SortIcon
              column="categories"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        {giftlists.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay colecciones creadas
          </div>
        ) : filteredGiftlists.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay colecciones que coincidan con los filtros
          </div>
        ) : (
          sortedGiftlists.map(giftlist => (
            <div
              key={giftlist.id}
              className="group grid grid-cols-1 items-center gap-4 border-b border-gray-100 px-4 py-4 hover:bg-gray-50 sm:grid-cols-12"
            >
              <div className="min-w-0 sm:col-span-3">
                <p className="truncate font-medium">{giftlist.name}</p>
              </div>
              <div className="text-sm text-textTertiary sm:col-span-2">
                <span className="font-medium text-textPrimary sm:hidden">
                  Regalos:{' '}
                </span>
                {giftlist.gifts.length}
              </div>
              <div className="text-sm text-textTertiary sm:col-span-2">
                <span className="font-medium text-textPrimary sm:hidden">
                  Tipos de evento:{' '}
                </span>
                {giftlist.eventTypes
                  .map(eventType => eventType.name)
                  .join(', ') || 'Sin asignar'}
              </div>
              <div className="text-sm text-textTertiary sm:col-span-3">
                <span className="font-medium text-textPrimary sm:hidden">
                  Categorías:{' '}
                </span>
                {getCategoryNames(giftlist).join(', ') || 'Sin categorías'}
              </div>
              <div className="col-span-2 flex justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <EditGiftlistDialog
                  giftlist={giftlist}
                  gifts={giftOptions}
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
