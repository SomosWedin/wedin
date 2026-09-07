import { getPublicEventUrl } from '@/lib/event-domain'

export type AdminEventListItem = {
  id: string
  url: string | null
  createdAt: Date
  date: Date | null
  eventType: { id: string; name: string }
  users: {
    id: string
    name: string | null
    lastName: string | null
    email: string | null
    isPrimary: boolean
  }[]
}

export type AdminEventSortColumn = 'createdAt' | 'date'
export type AdminEventSortDirection = 'asc' | 'desc'

export type AdminEventRow = AdminEventListItem & {
  organizerName: string
  organizerEmail: string
  publicUrl: string | null
}

type AdminEventListOptions = {
  search?: string
  eventTypeId?: string
  sortColumn?: AdminEventSortColumn
  sortDirection?: AdminEventSortDirection
}

function eventPublicUrl(slug: string | null) {
  if (!slug) return null

  try {
    return getPublicEventUrl(slug)
  } catch {
    return null
  }
}

function eventRow(event: AdminEventListItem): AdminEventRow {
  const organizer = event.users.find(user => user.isPrimary) ?? event.users[0]
  const organizerName = [organizer?.name, organizer?.lastName]
    .filter(Boolean)
    .join(' ')

  return {
    ...event,
    organizerName: organizerName || 'Sin organizador',
    organizerEmail: organizer?.email || 'Sin email',
    publicUrl: eventPublicUrl(event.url),
  }
}

function compareDates(
  first: Date | null,
  second: Date | null,
  direction: AdminEventSortDirection
) {
  if (first === null && second === null) return 0
  if (first === null) return 1
  if (second === null) return -1

  const comparison = first.getTime() - second.getTime()
  return direction === 'asc' ? comparison : -comparison
}

export function getAdminEventRows(
  events: AdminEventListItem[],
  {
    search = '',
    eventTypeId = '',
    sortColumn = 'createdAt',
    sortDirection = 'desc',
  }: AdminEventListOptions = {}
) {
  const normalizedSearch = search.trim().toLocaleLowerCase('es-PY')

  return events
    .map(eventRow)
    .filter(event => !eventTypeId || event.eventType.id === eventTypeId)
    .filter(event => {
      if (!normalizedSearch) return true

      return [
        event.id,
        event.organizerName,
        event.organizerEmail,
        event.publicUrl,
      ].some(value =>
        value?.toLocaleLowerCase('es-PY').includes(normalizedSearch)
      )
    })
    .sort((first, second) =>
      compareDates(first[sortColumn], second[sortColumn], sortDirection)
    )
}
