'use client'

import type { Category, EventType, Prisma } from '@prisma/client'
import { format } from 'date-fns'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  IoChevronDown,
  IoChevronUp,
  IoDownloadOutline,
  IoGiftOutline,
  IoSearchOutline,
  IoSwapVerticalOutline,
} from 'react-icons/io5'
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
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { buildAdminGiftsCsv } from '@/lib/admin-gift-csv'
import { downloadCsv } from '@/lib/csv'
import CreateGiftDialog from '../dialog/create-gift-dialog'
import DeleteAdminGiftDialog from '../dialog/delete-admin-gift-dialog'
import EditAdminGiftDialog from '../dialog/edit-admin-gift-dialog'

type GiftWithImage = Prisma.GiftGetPayload<{
  include: { image: true }
}>

type AdminGiftsListProps = {
  gifts: GiftWithImage[]
  categories: Category[]
  giftlists: GiftlistOption[]
  eventTypes: EventType[]
}

type SortColumn = 'createdAt' | 'price'
type SortDirection = 'asc' | 'desc'

function SortIcon({
  column,
  activeColumn,
  direction,
}: {
  column: SortColumn
  activeColumn: SortColumn | null
  direction: SortDirection
}) {
  if (activeColumn !== column) {
    return <IoSwapVerticalOutline className="text-gray-400" />
  }

  return direction === 'asc' ? <IoChevronUp /> : <IoChevronDown />
}

export default function AdminGiftsList({
  gifts,
  categories,
  giftlists,
  eventTypes,
}: AdminGiftsListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [giftlistFilter, setGiftlistFilter] = useState('')
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const categoryNameById = useMemo(
    () => new Map(categories.map(category => [category.id, category.name])),
    [categories]
  )
  const giftlistNameById = useMemo(
    () => new Map(giftlists.map(giftlist => [giftlist.id, giftlist.name])),
    [giftlists]
  )

  const categoryOptions = useMemo(
    () =>
      categories.map(category => ({
        value: category.id,
        label: category.name,
      })),
    [categories]
  )
  const giftlistOptions = useMemo(
    () =>
      giftlists.map(giftlist => ({
        value: giftlist.id,
        label: giftlist.name,
      })),
    [giftlists]
  )

  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column)
      setSortDirection('desc')
      return
    }

    setSortDirection(direction => (direction === 'desc' ? 'asc' : 'desc'))
  }

  const filteredGifts = gifts.filter(gift => {
    const categoryName =
      categoryNameById.get(gift.categoryId) ?? 'Sin categoría'
    const giftlistNames = gift.giftlistIds
      .map(giftlistId => giftlistNameById.get(giftlistId))
      .filter((name): name is string => Boolean(name))
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch =
      !normalizedSearch ||
      gift.name.toLowerCase().includes(normalizedSearch) ||
      categoryName.toLowerCase().includes(normalizedSearch) ||
      giftlistNames.some(name => name.toLowerCase().includes(normalizedSearch))
    const matchesCategory =
      !categoryFilter || gift.categoryId === categoryFilter
    const matchesGiftlist =
      !giftlistFilter || gift.giftlistIds.includes(giftlistFilter)

    return matchesSearch && matchesCategory && matchesGiftlist
  })
  const hasActiveFilters =
    Boolean(search.trim()) || Boolean(categoryFilter) || Boolean(giftlistFilter)

  const sortedGifts = sortColumn
    ? [...filteredGifts].sort((a, b) => {
        const diff =
          sortColumn === 'createdAt'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : Number(a.price) - Number(b.price)

        return sortDirection === 'asc' ? diff : -diff
      })
    : filteredGifts

  const exportGifts = (selectedGifts: GiftWithImage[], filename: string) => {
    downloadCsv(
      buildAdminGiftsCsv({
        gifts: selectedGifts,
        categories,
        giftlists,
        eventTypes,
      }),
      filename
    )
  }

  const handleExportButton = () => {
    if (hasActiveFilters) {
      setExportDialogOpen(true)
      return
    }

    exportGifts(gifts, 'regalos.csv')
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Nombre, categoría o colección"
            className="pl-10"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <Combobox
          options={categoryOptions}
          selected={categoryFilter}
          onChange={value => setCategoryFilter(value as string)}
          placeholder="Buscar categoría"
          className="sm:w-56"
          width="w-56"
          clearable
          selectionMode="value"
        />
        <Combobox
          options={giftlistOptions}
          selected={giftlistFilter}
          onChange={value => setGiftlistFilter(value as string)}
          placeholder="Buscar colección"
          className="sm:w-56"
          width="w-56"
          clearable
          selectionMode="value"
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={gifts.length === 0}
          onClick={handleExportButton}
        >
          Exportar CSV <IoDownloadOutline className="text-lg" />
        </Button>
        <CreateGiftDialog
          mode="admin"
          categories={categories}
          giftlists={giftlists}
          eventTypes={eventTypes}
        />
      </div>

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-4">Regalo</div>
          <div className="col-span-2">Categoría</div>
          <button
            type="button"
            className="flex col-span-2 gap-3 items-center text-left hover:text-textPrimary"
            onClick={() => handleSort('createdAt')}
          >
            Fecha
            <SortIcon
              column="createdAt"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <button
            type="button"
            className="flex col-span-2 gap-3 items-center text-left hover:text-textPrimary"
            onClick={() => handleSort('price')}
          >
            Precio
            <SortIcon
              column="price"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {sortedGifts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron regalos
          </div>
        )}

        {sortedGifts.map(gift => (
          <div
            key={gift.id}
            className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 group hover:bg-gray-50"
          >
            <div className="flex col-span-4 gap-3 items-center min-w-0">
              <div className="flex justify-center items-center w-12 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
                {gift.image?.url ? (
                  <Image
                    src={gift.image.url}
                    alt={gift.name}
                    className="object-cover w-full h-full"
                    width={48}
                    height={48}
                  />
                ) : (
                  <IoGiftOutline className="text-2xl text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{gift.name}</p>
                <p className="truncate text-xs text-textTertiary">
                  {gift.giftlistIds.length
                    ? gift.giftlistIds
                        .map(
                          giftlistId =>
                            giftlistNameById.get(giftlistId) ??
                            'Colección no encontrada'
                        )
                        .join(', ')
                    : 'Sin colección'}
                </p>
              </div>
            </div>
            <div className="col-span-2 text-sm text-textTertiary">
              {categoryNameById.get(gift.categoryId) ?? 'Sin categoría'}
            </div>
            <div className="col-span-2 text-sm text-textTertiary">
              {format(gift.createdAt, 'dd/MM/yyyy')}
            </div>
            <div className="col-span-2 whitespace-nowrap tabular-nums">
              Gs. {Number(gift.price).toLocaleString('es-PY')}
            </div>
            <div className="flex col-span-2 gap-2 justify-end opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <EditAdminGiftDialog
                gift={gift}
                categories={categories}
                giftlists={giftlists}
                eventTypes={eventTypes}
              />
              <DeleteAdminGiftDialog giftId={gift.id} giftName={gift.name} />
            </div>
          </div>
        ))}
      </div>
      <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Qué regalos querés exportar?</AlertDialogTitle>
            <AlertDialogDescription>
              Hay filtros activos. Podés exportar los regalos visibles o todos
              los regalos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => exportGifts(gifts, 'regalos.csv')}
            >
              Exportar todos
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-success text-white hover:bg-success/80"
              disabled={filteredGifts.length === 0}
              onClick={() =>
                exportGifts(filteredGifts, 'regalos-filtrados.csv')
              }
            >
              Exportar resultados filtrados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
