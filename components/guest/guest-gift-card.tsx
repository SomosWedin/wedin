'use client';

import Image from 'next/image';
import {
  IoCartOutline,
  IoCheckmarkCircleOutline,
  IoGiftOutline,
} from 'react-icons/io5';
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
  onOpenGiftDetails: (wishlistGift: WishlistGiftWithGift) => void;
};

export default function GuestGiftCard({
  wishlistGift,
  onAddFullPrice,
  onOpenContributionDialog,
  onOpenGiftDetails,
}: GuestGiftCardProps) {
  const { gift } = wishlistGift;
  const { priceValue, remaining, percentage } = getGiftProgress(
    gift.price,
    wishlistGift.transactions
  );
  const isComplete =
    wishlistGift.isFullyPaid || (priceValue > 0 && remaining <= 0);

  const handleCardClick = () => {
    if (isComplete) return;
    if (wishlistGift.isGroupGift) {
      onOpenContributionDialog(wishlistGift);
    } else {
      onOpenGiftDetails(wishlistGift);
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 p-3 rounded-xl transition-shadow hover:shadow-sm justify-between bg-gray-50 ${!isComplete ? 'cursor-pointer' : ''}`}
      onClick={!isComplete ? handleCardClick : undefined}
    >
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
            <div className="flex gap-1.5 items-center px-3 py-1.5 bg-white rounded-full shadow-sm z-10">
              <IoCheckmarkCircleOutline className="text-lg text-success" />
              <span className="text-sm font-medium text-success">Recibido</span>
            </div>
          </div>
        )}
        <div className="flex absolute bottom-3 left-3 flex-col gap-1.5 items-start max-w-[calc(100%-1.5rem)]">
          <GiftTypeBadge
            isGroupGift={wishlistGift.isGroupGift}
            className="text-[11px] px-2 sm:text-xs sm:px-2.5"
          />
          {wishlistGift.isFavoriteGift && (
            <GiftFavoriteBadge className="text-[11px] px-2 sm:text-xs sm:px-2.5" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-normal text-sm line-clamp-2 min-h-[2.5rem] sm:min-h-0 sm:text-lg sm:truncate sm:line-clamp-none">
          {gift.name}
        </p>

        {wishlistGift.isGroupGift ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:justify-between sm:gap-0 sm:text-sm">
              <span>Faltan: Gs. {remaining.toLocaleString('es-PY')}</span>
              <span>
                {percentage}% {isComplete && '✅'}
              </span>
            </div>
            <Progress value={percentage} />
          </div>
        ) : (
          <p className="font-semibold text-lg">
            Gs. {Number(gift.price).toLocaleString('es-PY')}
          </p>
        )}
      </div>

      {wishlistGift.isGroupGift ? (
        <Button
          variant="success"
          className="gap-1 justify-between text-xs sm:gap-2 sm:text-sm"
          onClick={event => {
            event.stopPropagation();
            onOpenContributionDialog(wishlistGift);
          }}
          disabled={isComplete}
        >
          {isComplete ? 'Regalo recibido' : 'Contribuir'}{' '}
          {isComplete && '🎉'}
          {!isComplete && <IoCartOutline className="text-lg shrink-0" />}
        </Button>
      ) : (
        <Button
          variant="success"
          className="gap-1 justify-between text-xs sm:gap-2 sm:text-sm"
          onClick={event => {
            event.stopPropagation();
            onAddFullPrice(wishlistGift);
          }}
          disabled={isComplete}
        >
          {isComplete ? 'Regalo recibido' : 'Agregar al carrito'}{' '}
          {isComplete && '🎉'}
          {!isComplete && <IoCartOutline className="text-lg shrink-0" />}
        </Button>
      )}
    </div>
  );
}
