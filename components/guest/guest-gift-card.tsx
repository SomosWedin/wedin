'use client';

import Image from 'next/image';
import {
  IoCartOutline,
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoChevronForward,
  IoGiftOutline,
} from 'react-icons/io5';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import GiftTypeBadge from '@/components/dashboard/gift-type-badge';
import GiftFavoriteBadge from '@/components/dashboard/gift-favorite-badge';
import { getGiftProgress } from '@/components/guest/gift-progress';
import type { Prisma } from '@prisma/client';

export type WishlistGiftWithGift = Prisma.WishlistGiftGetPayload<{
  include: {
    gift: { include: { image: true } };
    transactions: { select: { amount: true } };
  };
}>;

type GuestGiftCardProps = {
  wishlistGift: WishlistGiftWithGift;
  onAddFullPrice: (wishlistGift: WishlistGiftWithGift) => void;
  onOpenContributionDialog: (wishlistGift: WishlistGiftWithGift) => void;
};

export default function GuestGiftCard({
  wishlistGift,
  onAddFullPrice,
  onOpenContributionDialog,
}: GuestGiftCardProps) {
  const { gift } = wishlistGift;
  const { priceValue, remaining, percentage } = getGiftProgress(
    gift.price,
    wishlistGift.transactions
  );
  const isComplete =
    wishlistGift.isFullyPaid || (priceValue > 0 && remaining <= 0);

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl transition-shadow hover:shadow-sm justify-between bg-gray-50">
      <div className="relative overflow-hidden w-full bg-gray-100 rounded-lg aspect-square">
        {gift.image?.url ? (
          <Image
            src={gift.image.url}
            alt={gift.name}
            fill
            className={`object-cover ${isComplete ? 'opacity-60' : ''}`}
          />
        ) : (
          <div className="flex justify-center items-center w-full h-full">
            <IoGiftOutline className="text-4xl text-gray-300" />
          </div>
        )}
        {isComplete && (
          <div className="flex absolute inset-0 justify-center items-center">
            <div className="flex gap-1.5 items-center px-3 py-1.5 bg-white rounded-full shadow-sm">
              <IoCheckmarkCircleOutline className="text-lg text-success" />
              <span className="text-sm font-medium text-success">
                Recibido
              </span>
            </div>
          </div>
        )}
        <div className="flex absolute bottom-3 left-3 flex-col gap-1.5 items-start">
          <GiftTypeBadge isGroupGift={wishlistGift.isGroupGift} />
          {wishlistGift.isFavoriteGift && <GiftFavoriteBadge />}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-normal text-lg truncate">{gift.name}</p>

        {wishlistGift.isGroupGift ? ( 
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span>Faltan: Gs. {remaining.toLocaleString('es-PY')}</span>
              <span>{percentage}% {isComplete && '🎉'}</span>
            </div>
            <Progress value={percentage} />
          </div>
        ) : (
          <p className="font-semibold text-lg">
            Gs. {Number(gift.price).toLocaleString('es-PY')} {isComplete && '🎉'}
          </p>
        )}
      </div>

      {wishlistGift.isGroupGift ? (
        <Button
          className={`gap-2 justify-between bg-gray-100 hover:bg-gray-200 transition-colors ${isComplete ? 'bg-success/10 text-success' : ''}`}
          onClick={() => onOpenContributionDialog(wishlistGift)}
          disabled={isComplete}
        >
          {isComplete ? 'Regalo recibido' : 'Seleccionar monto'}
          <IoChevronForward className="text-lg" />
        </Button>
      ) : (
        <Button
          className={`gap-2 justify-between bg-gray-100 hover:bg-gray-200 transition-colors ${isComplete ? 'bg-success/10 text-success' : ''}`}
          onClick={() => onAddFullPrice(wishlistGift)}
          disabled={isComplete}
        >
          {isComplete ? 'Regalo recibido' : 'Agregar al carrito'}
          <IoCartOutline className="text-lg" />
        </Button>
      )}
    </div>
  );
}
