'use client'

import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import {
  IoChevronDown,
  IoChevronUp,
  IoOpenOutline,
  IoSearchOutline,
} from 'react-icons/io5'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  type AdminEventListItem,
  type AdminEventSortColumn,
  getAdminEventRows,
} from '@/lib/admin-events'

function SortIcon({ direction }: { direction: 'asc' | 'desc' }) {
  return direction === 'asc' ? <IoChevronUp /> : <IoChevronDown />
}

export default function AdminEventsList({
  events,
}: {
  events: AdminEventListItem[]
}) {
  const [search, setSearch] = useState('')
  const [eventTypeId, setEventTypeId] = useState('')
  const [sortColumn, setSortColumn] =
    useState<AdminEventSortColumn>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const eventTypeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          events.map(event => [event.eventType.id, event.eventType])
        ).values()
      )
        .sort((first, second) =>
          first.name.localeCompare(second.name, 'es', { sensitivity: 'base' })
        )
        .map(eventType => ({
          value: eventType.id,
          label: eventType.name,
        })),
    [events]
  )

  const rows = getAdminEventRows(events, {
    search,
    eventTypeId,
    sortColumn,
    sortDirection,
  })

  const changeSort = (column: AdminEventSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(direction => (direction === 'desc' ? 'asc' : 'desc'))
      return
    }

    setSortColumn(column)
    setSortDirection('desc')
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-[220px] flex-1">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            aria-label="Buscar eventos"
            placeholder="Buscar por ID, organizador, email o URL"
            className="pl-10"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <Combobox
          className="w-full sm:w-64"
          options={eventTypeOptions}
          selected={eventTypeId}
          selectionMode="value"
          placeholder="Todos los tipos"
          clearable
          onChange={value => setEventTypeId(String(value))}
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white">
        <div className="hidden grid-cols-12 gap-3 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 sm:grid">
          <span className="col-span-2">ID del evento</span>
          <span className="col-span-2">Tipo</span>
          <span className="col-span-2">Organizador</span>
          <span className="col-span-2">Email</span>
          <span className="col-span-2">URL</span>
          <button
            type="button"
            className="flex items-center gap-1 text-left hover:text-textPrimary"
            aria-label={`Ordenar por creación ${
              sortColumn === 'createdAt' && sortDirection === 'desc'
                ? 'ascendentemente'
                : 'descendentemente'
            }`}
            onClick={() => changeSort('createdAt')}
          >
            Creado
            {sortColumn === 'createdAt' && (
              <SortIcon direction={sortDirection} />
            )}
          </button>
          <button
            type="button"
            className="flex items-center gap-1 text-left hover:text-textPrimary"
            aria-label={`Ordenar por fecha del evento ${
              sortColumn === 'date' && sortDirection === 'desc'
                ? 'ascendentemente'
                : 'descendentemente'
            }`}
            onClick={() => changeSort('date')}
          >
            Fecha
            {sortColumn === 'date' && <SortIcon direction={sortDirection} />}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay eventos que coincidan con los filtros
          </div>
        ) : (
          rows.map(event => (
            <div
              key={event.id}
              className="grid grid-cols-1 gap-3 border-b border-gray-100 px-4 py-4 text-sm hover:bg-gray-50 sm:grid-cols-12 sm:items-center"
            >
              <div className="min-w-0 sm:col-span-2">
                <span className="text-xs font-medium text-gray-500 sm:hidden">
                  ID del evento
                </span>
                <p className="break-all font-mono text-xs" title={event.id}>
                  {event.id}
                </p>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <span className="text-xs font-medium text-gray-500 sm:hidden">
                  Tipo
                </span>
                <p>{event.eventType.name}</p>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <span className="text-xs font-medium text-gray-500 sm:hidden">
                  Organizador
                </span>
                <p className="truncate" title={event.organizerName}>
                  {event.organizerName}
                </p>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <span className="text-xs font-medium text-gray-500 sm:hidden">
                  Email
                </span>
                <p className="truncate" title={event.organizerEmail}>
                  {event.organizerEmail}
                </p>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <span className="text-xs font-medium text-gray-500 sm:hidden">
                  URL
                </span>
                {event.publicUrl ? (
                  <a
                    href={event.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-1 text-primary underline"
                    title={event.publicUrl}
                  >
                    <span className="truncate">{event.publicUrl}</span>
                    <IoOpenOutline className="shrink-0" />
                  </a>
                ) : (
                  <p className="text-textTertiary">Sin URL</p>
                )}
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 sm:hidden">
                  Creado
                </span>
                <p>{format(event.createdAt, 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 sm:hidden">
                  Fecha del evento
                </span>
                <p>
                  {event.date ? format(event.date, 'dd/MM/yyyy') : 'Sin fecha'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
