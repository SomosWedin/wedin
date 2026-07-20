'use client';

import Image from 'next/image';
import { IoGiftOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import GiftTypeBadge from '@/components/dashboard/gift-type-badge';
import GiftFavoriteBadge from '@/components/dashboard/gift-favorite-badge';
import type { Gift, Image as ImageModel } from '@prisma/client';

type GiftDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift: Gift & { image: ImageModel | null };
  isFavoriteGift: boolean;
  onAddToCart: () => void;
};

export default function GiftDetailDialog({
  open,
  onOpenChange,
  gift,
  isFavoriteGift,
  onAddToCart,
}: GiftDetailDialogProps) {
  const handleAddToCart = () => {
    onAddToCart();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Detalles del producto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <div className="flex overflow-hidden justify-center items-center w-32 h-32 bg-gray-100 rounded-md shrink-0">
              {gift.image?.url ? (
                <Image
                  src={gift.image.url}
                  alt={gift.name}
                  className="object-cover w-full h-full"
                  width={128}
                  height={128}
                />
              ) : (
                <IoGiftOutline className="text-3xl text-gray-400" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-normal text-base">{gift.name}</p>
              <p className="font-medium text-xl">
                Gs. {Number(gift.price).toLocaleString('es-PY')}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <GiftTypeBadge isGroupGift={false} />
                {isFavoriteGift && <GiftFavoriteBadge />}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-[3] bg-gray-100 hover:bg-gray-200 transition-colors border-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleAddToCart}
              className="flex-[7]"
            >
              Agregar al carrito
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
