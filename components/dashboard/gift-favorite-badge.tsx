import { IoStarOutline } from 'react-icons/io5'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type GiftFavoriteBadgeProps = {
  className?: string
}

export default function GiftFavoriteBadge({
  className,
}: GiftFavoriteBadgeProps) {
  return (
    <Badge
      className={cn(
        'w-fit gap-1 font-medium bg-gray100 text-textPrimary border-transparent',
        className
      )}
    >
      <IoStarOutline />
      <span className="sm:hidden">Favorito</span>
      <span className="hidden sm:inline">El que más queremos</span>
    </Badge>
  )
}
