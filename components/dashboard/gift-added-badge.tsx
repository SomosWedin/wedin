import { IoBanOutline, IoCheckmark } from 'react-icons/io5'
import { Badge } from '@/components/ui/badge'

type GiftAddedBadgeProps = {
  isInWishlist: boolean
}

export default function GiftAddedBadge({ isInWishlist }: GiftAddedBadgeProps) {
  if (isInWishlist) {
    return (
      <Badge className="w-fit gap-1 font-medium bg-success/10 text-success border-transparent">
        <IoCheckmark />
        Regalo agregado
      </Badge>
    )
  }

  return (
    <Badge className="w-fit gap-1 font-medium bg-gray100 text-textPrimary border-transparent">
      <IoBanOutline />
      No agregado
    </Badge>
  )
}
