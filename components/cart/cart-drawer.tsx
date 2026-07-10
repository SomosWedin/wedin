'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IoCartOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CartItemRow from '@/components/cart/cart-item-row';
import type { CartItem } from '@/hooks/use-cart-store';

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  total: number;
  onRemoveItem: (id: string) => void;
};

export default function CartDrawer({
  open,
  onOpenChange,
  items,
  total,
  onRemoveItem,
}: CartDrawerProps) {
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Mi carrito</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex flex-col gap-2 items-center py-12 text-center text-gray-500">
            <IoCartOutline className="text-3xl text-gray-300" />
            Todavía no agregaste ningún regalo
          </div>
        ) : (
          <div className="flex overflow-y-auto flex-col divide-y divide-gray-100 max-h-96">
            {items.map(item => (
              <CartItemRow key={item.id} item={item} onRemove={onRemoveItem} />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex flex-col gap-3 pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
            <div className="flex justify-between items-center">
              <span className="text-textTertiary">Total en efectivo</span>
              <span className="text-lg font-semibold">
                Gs. {total.toLocaleString('es-PY')}
              </span>
            </div>
            <Button variant="success" className="w-full" asChild>
              <Link href={`${pathname}/checkout`}>Ir a pagar</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
