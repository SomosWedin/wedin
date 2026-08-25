import { IoPeopleOutline, IoPersonOutline } from 'react-icons/io5'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type GiftTypeBadgeProps = {
  isGroupGift: boolean
  className?: string
}

export default function GiftTypeBadge({
  isGroupGift,
  className,
}: GiftTypeBadgeProps) {
  return (
    <Badge
      className={cn(
        'w-fit gap-1 font-medium bg-gray100 text-textPrimary border-transparent',
        className
      )}
    >
      {isGroupGift ? <IoPeopleOutline /> : <IoPersonOutline />}
      {isGroupGift ? 'Regalo Grupal' : 'Regalo Individual'}
    </Badge>
  )
}
