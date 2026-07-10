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
      <div className="flex justify-between items-center px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex gap-6 sm:gap-10">
          <div className="flex flex-col">
            <span className="text-xs text-gray-300">Cantidad de regalos</span>
            <span className="text-lg font-semibold">{itemCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-300">En efectivo</span>
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
