import { Badge } from '@/components/ui/badge';
import { IoPeopleOutline, IoPersonOutline } from 'react-icons/io5';

type GiftTypeBadgeProps = {
  isGroupGift: boolean;
};

export default function GiftTypeBadge({ isGroupGift }: GiftTypeBadgeProps) {
  return (
    <Badge className="w-fit gap-1 font-medium bg-gray100 text-textPrimary border-transparent">
      {isGroupGift ? <IoPeopleOutline /> : <IoPersonOutline />}
      {isGroupGift ? 'Regalo Grupal' : 'Regalo Individual'}
    </Badge>
  );
}
