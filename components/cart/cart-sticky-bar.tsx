'use client';

import { IoCartOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';

type CartStickyBarProps = {
  itemCount: number;
  total: number;
  onOpenCart: () => void;
};

export default function CartStickyBar({
  itemCount,
  total,
  onOpenCart,
}: CartStickyBarProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 text-white bg-textPrimary">
      {/* Compact single-line bar below sm */}
      <div className="flex justify-between items-center px-4 py-3 mx-auto max-w-7xl sm:hidden">
        <div className="flex gap-6 items-center">
          <div className="relative">
            <IoCartOutline className="text-3xl" />
            <span className="flex absolute -top-1.5 -right-1.5 justify-center items-center w-4 h-4 text-[10px] font-semibold text-textPrimary bg-white rounded-full">
              {itemCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-300 text-xs">Subtotal</span>
            <span className="text-lg font-semibold">
              Gs. {total.toLocaleString('es-PY')}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-black"
          onClick={onOpenCart}
        >
          Ver mi carrito
        </Button>
      </div>

      {/* Original two-stat bar from sm and up */}
      <div className="hidden justify-between items-center p-4 mx-auto max-w-7xl sm:flex sm:px-6 lg:px-8">
        <div className="flex gap-6 sm:gap-10">
          <div className="flex flex-col">
            <span className="text-xs text-gray-300">Cantidad de regalos</span>
            <span className="text-lg font-semibold">{itemCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-300">Subtotal</span>
            <span className="text-lg font-semibold">
              Gs. {total.toLocaleString('es-PY')}
            </span>
          </div>
        </div>
        <Button variant="outline" className="gap-2 text-black" onClick={onOpenCart}>
          Ver mi carrito
          <IoCartOutline className="text-lg" />
        </Button>
      </div>
    </div>
  );
}
