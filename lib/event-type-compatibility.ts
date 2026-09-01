export function intersectEventTypeIds(eventTypeGroups: string[][]): string[] {
  if (eventTypeGroups.length === 0) return []

  return Array.from(new Set(eventTypeGroups[0])).filter(eventTypeId =>
    eventTypeGroups.slice(1).every(group => group.includes(eventTypeId))
  )
}

export function eventTypeIdsOverlap(left: string[], right: string[]) {
  return left.some(eventTypeId => right.includes(eventTypeId))
}

export function includesEveryEventType(
  availableEventTypeIds: string[],
  requiredEventTypeIds: string[]
) {
  return requiredEventTypeIds.every(eventTypeId =>
    availableEventTypeIds.includes(eventTypeId)
  )
}

export function filterByEventTypeIds<T extends { eventTypeIds: string[] }>(
  values: T[],
  eventTypeIds: string[]
) {
  if (eventTypeIds.length === 0) return []
  return values.filter(value =>
    includesEveryEventType(value.eventTypeIds, eventTypeIds)
  )
}
