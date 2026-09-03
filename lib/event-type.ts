export const SYSTEM_EVENT_TYPES = {
  WEDDING: { key: 'wedding', name: 'Casamiento' },
  OTHER: { key: 'other', name: 'Otro tipo de evento' },
} as const

export function isWeddingEventType(
  eventType: { key: string } | null | undefined
) {
  return eventType?.key === SYSTEM_EVENT_TYPES.WEDDING.key
}
