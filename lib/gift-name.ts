export function normalizeGiftName(name: string) {
  return name.trim().toLocaleLowerCase('es-ES')
}

export function buildGiftNameScopeKey({
  name,
  categoryId,
  isDefault,
  eventId,
}: {
  name: string
  categoryId: string
  isDefault: boolean
  eventId?: string
}) {
  return JSON.stringify({
    scope: isDefault ? 'default' : 'event',
    eventId: isDefault ? '' : (eventId ?? ''),
    categoryId,
    name: normalizeGiftName(name),
  })
}
