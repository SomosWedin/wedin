'use client';

import Image from 'next/image';
import { IoGiftOutline, IoTrashOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import type { CartItem } from '@/hooks/use-cart-store';

type CartItemRowProps = {
  item: CartItem;
  onRemove: (id: string) => void;
};

export default function CartItemRow({ item, onRemove }: CartItemRowProps) {
  return (
    <div className="flex gap-3 items-center py-3">
      <div className="flex overflow-hidden justify-center items-center w-16 h-16 bg-gray-100 rounded-md shrink-0">
        {item.giftImageUrl ? (
          <Image
            src={item.giftImageUrl}
            alt={item.giftName}
            className="object-cover w-full h-full"
            width={64}
            height={64}
          />
        ) : (
          <IoGiftOutline className="text-2xl text-gray-400" />
        )}
      </div>
      <div className="flex flex-col flex-1 gap-1 min-w-0">
        <p className="truncate font-normal text-base">{item.giftName}</p>
        <p className="font-medium text-lg">
          Gs. {Number(item.amount).toLocaleString('es-PY')}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Quitar del carrito"
        onClick={() => onRemove(item.id)}
      >
        <IoTrashOutline className="text-lg text-gray-500" />
      </Button>
    </div>
  );
}
