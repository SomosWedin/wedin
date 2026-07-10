'use client';

import { Button } from '@/components/ui/button';
import { useWishlistGift } from '@/hooks/dashboard/use-wishlist-gift';
import { Loader2 } from 'lucide-react';
import { IoCheckmarkCircle } from 'react-icons/io5';

type AddGiftlistToWishlistButtonProps = {
  eventId: string;
  wishlistId: string;
  giftIds: string[];
  allInWishlist: boolean;
};

export default function AddGiftlistToWishlistButton({
  eventId,
  wishlistId,
  giftIds,
  allInWishlist,
}: AddGiftlistToWishlistButtonProps) {
  const { loading, addAllToWishlist } = useWishlistGift();

  if (allInWishlist) {
    return (
      <Button variant="outline" className="gap-2" disabled>
        <IoCheckmarkCircle className="text-success" />
        Paquete agregado
      </Button>
    );
  }

  return (
    <Button
      variant="success"
      className="gap-2"
      disabled={loading || giftIds.length === 0}
      onClick={() => addAllToWishlist({ wishlistId, eventId, giftIds })}
    >
      Agregar paquete completo
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    </Button>
  );
}
