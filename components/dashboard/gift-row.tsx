'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IoGiftOutline } from 'react-icons/io5';
import AddToWishlistButton from '@/components/dashboard/add-to-wishlist-button';
import GiftTypeBadge from '@/components/dashboard/gift-type-badge';
import GiftAddedBadge from '@/components/dashboard/gift-added-badge';
import AddExistingGiftDialog from '@/components/dialog/add-existing-gift-dialog';
import type { Category, Gift, Image as ImageModel } from '@prisma/client';

type GiftRowProps = {
  gift: Gift & { image: ImageModel | null };
  eventId: string;
  wishlistId: string;
  categories: Category[];
  isInWishlist: boolean;
};

export default function GiftRow({
  gift,
  eventId,
  wishlistId,
  categories,
  isInWishlist,
}: GiftRowProps) {
  const [open, setOpen] = useState(false);
  const categoryName =
    categories.find(category => category.id === gift.categoryId)?.name ??
    'Sin categoría';

  return (
    <>
      <div
        role={isInWishlist ? undefined : 'button'}
        tabIndex={isInWishlist ? undefined : 0}
        onClick={() => {
          if (!isInWishlist) setOpen(true);
        }}
        onKeyDown={event => {
          if (!isInWishlist && (event.key === 'Enter' || event.key === ' ')) {
            setOpen(true);
          }
        }}
        className={`grid grid-cols-1 sm:grid-cols-12 gap-4 px-4 py-4 border-b border-gray-100 hover:bg-gray-50 items-center ${
          isInWishlist ? '' : 'cursor-pointer'
        }`}
      >
        <div className="col-span-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden shrink-0">
            {gift.image?.url ? (
              <Image
                src={gift.image.url}
                alt={gift.name}
                className="w-full h-full object-cover"
                width={48}
                height={48}
              />
            ) : (
              <IoGiftOutline className="text-2xl text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium">{gift.name}</p>
            <p className="text-sm text-gray-500">{categoryName}</p>
          </div>
        </div>
        <div className="col-span-2">
          <GiftTypeBadge isGroupGift={false} />
        </div>
        <div className="col-span-2">
          <span className="text-sm">
            Gs.{Number(gift.price).toLocaleString('es-PY')}
          </span>
        </div>
        <div className="col-span-2">
          <GiftAddedBadge isInWishlist={isInWishlist} />
        </div>
        <div className="col-span-2 flex justify-end">
          {!isInWishlist && <AddToWishlistButton />}
        </div>
      </div>

      {!isInWishlist && (
        <AddExistingGiftDialog
          open={open}
          onOpenChange={setOpen}
          gift={gift}
          eventId={eventId}
          wishlistId={wishlistId}
          categories={categories}
        />
      )}
    </>
  );
}
