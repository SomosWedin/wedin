export const SYSTEM_EVENT_TYPES = {
  WEDDING: { key: 'wedding', name: 'Casamiento' },
  OTHER: { key: 'other', name: 'Otro tipo de evento' },
} as const

export function isWeddingEventType(
  eventType: { key: string } | null | undefined
) {
  return eventType?.key === SYSTEM_EVENT_TYPES.WEDDING.key
}

export function sortEventTypesForOnboarding<
  T extends { key: string; name: string },
>(eventTypes: T[]) {
  return [...eventTypes].sort((a, b) => {
    if (a.key === b.key) return 0
    if (a.key === SYSTEM_EVENT_TYPES.WEDDING.key) return -1
    if (b.key === SYSTEM_EVENT_TYPES.WEDDING.key) return 1
    return a.name.localeCompare(b.name, 'es-PY')
  })
}
