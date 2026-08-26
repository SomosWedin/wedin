'use client'

import type { Category, Prisma } from '@prisma/client'
import { endOfDay, format } from 'date-fns'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  IoChevronDown,
  IoChevronUp,
  IoGiftOutline,
  IoSearchOutline,
  IoSwapVerticalOutline,
} from 'react-icons/io5'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import CreateGiftDialog from '../dialog/create-gift-dialog'

type GiftWithImage = Prisma.GiftGetPayload<{
  include: { image: true }
}>

type AdminGiftsListProps = {
  gifts: GiftWithImage[]
  categories: Category[]
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
}: AdminGiftsListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const categoryNameById = useMemo(
    () => new Map(categories.map(category => [category.id, category.name])),
    [categories]
  )

  const categoryOptions = useMemo(
    () =>
      categories.map(category => ({
        value: category.id,
        label: category.name,
      })),
    [categories]
  )

  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column)
      setSortDirection('desc')
      return
    }

    setSortDirection(direction => (direction === 'desc' ? 'asc' : 'desc'))
  }

  const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
  const toDate = dateTo ? endOfDay(new Date(`${dateTo}T00:00:00`)) : null

  const filteredGifts = gifts.filter(gift => {
    const categoryName =
      categoryNameById.get(gift.categoryId) ?? 'Sin categoría'
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch =
      !normalizedSearch ||
      gift.name.toLowerCase().includes(normalizedSearch) ||
      categoryName.toLowerCase().includes(normalizedSearch)
    const matchesCategory = !categoryFilter || categoryName === categoryFilter
    const matchesDateRange =
      (!fromDate || gift.createdAt >= fromDate) &&
      (!toDate || gift.createdAt <= toDate)

    return matchesSearch && matchesCategory && matchesDateRange
  })

  const sortedGifts = sortColumn
    ? [...filteredGifts].sort((a, b) => {
      const diff =
        sortColumn === 'createdAt'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : Number(a.price) - Number(b.price)

      return sortDirection === 'asc' ? diff : -diff
    })
    : filteredGifts

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Nombre o categoría"
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
        />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Desde"
            className="h-10 w-[9.5rem] cursor-pointer"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={event => setDateFrom(event.target.value)}
            onClick={event => event.currentTarget.showPicker?.()}
          />
          <span className="text-gray-400">–</span>
          <Input
            type="date"
            aria-label="Hasta"
            className="h-10 w-[9.5rem] cursor-pointer"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={event => setDateTo(event.target.value)}
            onClick={event => event.currentTarget.showPicker?.()}
          />
        </div>
        <CreateGiftDialog categories={categories} />
      </div>

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-5">Regalo</div>
          <div className="col-span-3">Categoría</div>
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
        </div>

        {sortedGifts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron regalos
          </div>
        )}

        {sortedGifts.map(gift => (
          <div
            key={gift.id}
            className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
          >
            <div className="flex col-span-5 gap-3 items-center min-w-0">
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
              <span className="font-medium truncate">{gift.name}</span>
            </div>
            <div className="col-span-3 text-sm text-textTertiary">
              {categoryNameById.get(gift.categoryId) ?? 'Sin categoría'}
            </div>
            <div className="col-span-2 text-sm text-textTertiary">
              {format(gift.createdAt, 'dd/MM/yyyy')}
            </div>
            <div className="col-span-2 whitespace-nowrap tabular-nums">
              Gs. {Number(gift.price).toLocaleString('es-PY')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
