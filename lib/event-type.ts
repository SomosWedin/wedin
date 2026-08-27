import { EventType } from '@prisma/client'

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  [EventType.WEDDING]: 'Casamiento',
  [EventType.OTHER]: 'Otro tipo de evento',
}
