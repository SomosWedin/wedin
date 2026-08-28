'use client'

import type { Category, EventType } from '@prisma/client'
import { useState } from 'react'
import { IoChevronDown, IoChevronUp, IoSearchOutline } from 'react-icons/io5'
import AdminCategoryDialog from '@/components/dialog/admin-category-dialog'
import DeleteAdminCategoryDialog from '@/components/dialog/delete-admin-category-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AdminCategoriesList({
  categories,
  eventTypes,
}: {
  categories: (Category & { eventTypes: Pick<EventType, 'id' | 'name'>[] })[]
  eventTypes: EventType[]
}) {
  const [nameFilter, setNameFilter] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [eventTypeSort, setEventTypeSort] = useState<'asc' | 'desc'>('asc')
  const normalizedNameFilter = nameFilter.trim().toLocaleLowerCase('es-PY')
  const filteredCategories = categories.filter(category => {
    const matchesName = category.name
      .toLocaleLowerCase('es-PY')
      .includes(normalizedNameFilter)
    const matchesEventType =
      eventTypeFilter === 'all' ||
      category.eventTypeIds.includes(eventTypeFilter)

    return matchesName && matchesEventType
  })
  const sortedCategories = [...filteredCategories].sort((first, second) => {
    const firstTypes = first.eventTypes
      .map(eventType => eventType.name)
      .sort((left, right) => left.localeCompare(right, 'es'))
      .join(', ')
    const secondTypes = second.eventTypes
      .map(eventType => eventType.name)
      .sort((left, right) => left.localeCompare(right, 'es'))
      .join(', ')

    if (!firstTypes && secondTypes) return 1
    if (firstTypes && !secondTypes) return -1

    const comparison = firstTypes.localeCompare(secondTypes, 'es', {
      sensitivity: 'base',
    })
    return eventTypeSort === 'asc' ? comparison : -comparison
  })

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-[200px] flex-1">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            aria-label="Buscar categoría por nombre"
            placeholder="Buscar por nombre"
            className="pl-10"
            value={nameFilter}
            onChange={event => setNameFilter(event.target.value)}
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger
            aria-label="Filtrar por tipo de evento"
            className="bg-white sm:w-60"
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
        <AdminCategoryDialog eventTypes={eventTypes} />
      </div>
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="hidden grid-cols-12 gap-4 rounded-t-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 sm:grid">
          <div className="col-span-5">Nombre</div>
          <button
            type="button"
            className="col-span-5 flex items-center gap-2 text-left hover:text-textPrimary"
            aria-label={`Ordenar tipos de evento ${
              eventTypeSort === 'asc' ? 'descendentemente' : 'ascendentemente'
            }`}
            onClick={() =>
              setEventTypeSort(direction =>
                direction === 'asc' ? 'desc' : 'asc'
              )
            }
          >
            Tipo de evento
            {eventTypeSort === 'asc' ? <IoChevronUp /> : <IoChevronDown />}
          </button>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        {categories.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay categorías creadas
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay categorías que coincidan con los filtros
          </div>
        ) : (
          sortedCategories.map(category => (
            <div
              key={category.id}
              className="grid grid-cols-1 items-center gap-4 border-b border-gray-100 px-4 py-4 hover:bg-gray-50 sm:grid-cols-12 group"
            >
              <div className="min-w-0 sm:col-span-5">
                <p className="truncate font-medium">{category.name}</p>
              </div>
              <div className="text-sm text-textTertiary sm:col-span-5">
                {category.eventTypes.length
                  ? category.eventTypes
                      .map(eventType => eventType.name)
                      .join(', ')
                  : 'Sin asignar'}
              </div>
              <div className="flex col-span-2 gap-2 justify-end opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <AdminCategoryDialog
                  category={category}
                  eventTypes={eventTypes}
                />
                <DeleteAdminCategoryDialog
                  categoryId={category.id}
                  categoryName={category.name}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
