'use client'

import type { EventType } from '@prisma/client'
import { useState } from 'react'
import {
  IoChevronDown,
  IoChevronUp,
  IoSearchOutline,
  IoSwapVerticalOutline,
} from 'react-icons/io5'
import AdminEventTypeDialog from '@/components/dialog/admin-event-type-dialog'
import { Input } from '@/components/ui/input'

export default function AdminEventTypesList({
  eventTypes,
}: {
  eventTypes: EventType[]
}) {
  const [nameFilter, setNameFilter] = useState('')
  const [nameSort, setNameSort] = useState<'asc' | 'desc' | null>(null)
  const normalizedNameFilter = nameFilter.trim().toLocaleLowerCase('es-PY')
  const filteredEventTypes = eventTypes.filter(eventType =>
    eventType.name.toLocaleLowerCase('es-PY').includes(normalizedNameFilter)
  )
  const sortedEventTypes = nameSort
    ? [...filteredEventTypes].sort((first, second) => {
        const comparison = first.name.localeCompare(second.name, 'es', {
          sensitivity: 'base',
        })
        return nameSort === 'asc' ? comparison : -comparison
      })
    : filteredEventTypes

  const toggleNameSort = () => {
    setNameSort(direction => {
      if (direction === null) return 'asc'
      if (direction === 'asc') return 'desc'
      return null
    })
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-[200px] flex-1">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            aria-label="Buscar tipo de evento por nombre"
            placeholder="Buscar por nombre"
            className="pl-10"
            value={nameFilter}
            onChange={event => setNameFilter(event.target.value)}
          />
        </div>
        <AdminEventTypeDialog />
      </div>
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
          <button
            type="button"
            className="flex items-center gap-2 hover:text-textPrimary"
            aria-label={`Ordenar nombres ${
              nameSort === null
                ? 'ascendentemente'
                : nameSort === 'asc'
                  ? 'descendentemente'
                  : 'por defecto'
            }`}
            onClick={toggleNameSort}
          >
            Nombre
            {nameSort === null ? (
              <IoSwapVerticalOutline className="text-gray-400" />
            ) : nameSort === 'asc' ? (
              <IoChevronUp />
            ) : (
              <IoChevronDown />
            )}
          </button>
        </div>
        {eventTypes.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay tipos de evento creados
          </div>
        ) : sortedEventTypes.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay tipos de evento que coincidan con el filtro
          </div>
        ) : (
          sortedEventTypes.map(eventType => (
            <div
              key={eventType.id}
              className="border-b border-gray-100 px-4 py-4 hover:bg-gray-50"
            >
              <p className="font-medium">{eventType.name}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
