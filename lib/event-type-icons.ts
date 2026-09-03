import { CiHeart } from 'react-icons/ci'
import {
  GiBabyBottle,
  GiBalloons,
  GiCakeSlice,
  GiWineGlass,
} from 'react-icons/gi'
import type { IconType } from 'react-icons/lib'
import { MdCelebration } from 'react-icons/md'
import { SYSTEM_EVENT_TYPES } from '@/lib/event-type'

const EVENT_TYPE_ICONS: Record<string, IconType> = {
  [SYSTEM_EVENT_TYPES.WEDDING.key]: CiHeart,
  [SYSTEM_EVENT_TYPES.BIRTHDAY.key]: GiCakeSlice,
  [SYSTEM_EVENT_TYPES.BABY_SHOWER.key]: GiBabyBottle,
  [SYSTEM_EVENT_TYPES.SWEET_15.key]: GiBalloons,
  [SYSTEM_EVENT_TYPES.OTHER.key]: GiWineGlass,
}

export function getEventTypeIcon(key: string): IconType {
  return EVENT_TYPE_ICONS[key] ?? MdCelebration
}
