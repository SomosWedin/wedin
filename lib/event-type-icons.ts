import {
  Baby,
  Cake,
  Crown,
  Heart,
  type LucideIcon,
  Sparkles,
  Wine,
} from 'lucide-react'
import { SYSTEM_EVENT_TYPES } from '@/lib/event-type'

const EVENT_TYPE_ICONS: Record<string, LucideIcon> = {
  [SYSTEM_EVENT_TYPES.WEDDING.key]: Heart,
  [SYSTEM_EVENT_TYPES.BIRTHDAY.key]: Cake,
  [SYSTEM_EVENT_TYPES.BABY_SHOWER.key]: Baby,
  [SYSTEM_EVENT_TYPES.SWEET_15.key]: Crown,
  [SYSTEM_EVENT_TYPES.OTHER.key]: Wine,
}

export function getEventTypeIcon(key: string): LucideIcon {
  return EVENT_TYPE_ICONS[key] ?? Sparkles
}
