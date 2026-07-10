import { Badge } from '@/components/ui/badge';
import { IoStarOutline } from 'react-icons/io5';

export default function GiftFavoriteBadge() {
  return (
    <Badge className="w-fit gap-1 font-medium bg-gray100 text-textPrimary border-transparent">
      <IoStarOutline />
      El que más queremos
    </Badge>
  );
}
