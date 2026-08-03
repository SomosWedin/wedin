'use client'

import Link from 'next/link'
import { IoCartOutline } from 'react-icons/io5'
import CartItemRow from '@/components/cart/cart-item-row'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CartItem } from '@/hooks/use-cart-store'

type CartDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CartItem[]
  total: number
  onRemoveItem: (id: string) => void
  onEditItem: (item: CartItem) => void
}

export default function CartDrawer({
  open,
  onOpenChange,
  items,
  total,
  onRemoveItem,
  onEditItem,
}: CartDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col min-h-[42vh] sm:min-h-[36vh] max-w-lg max-h-[56vh]"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Mi carrito</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="flex flex-col flex-1 gap-2 justify-center items-center text-center text-gray-500">
            <IoCartOutline className="text-3xl text-gray-300" />
            Todavía no agregaste ningún regalo
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {items.map(item => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={onRemoveItem}
                  onEdit={onEditItem}
                />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-textTertiary">Subtotal</span>
              <span className="text-lg font-semibold">
                Gs. {total.toLocaleString('es-PY')}
              </span>
            </div>
          </>
        )}

        {items.length > 0 && (
          <div className="pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-[3] bg-gray-100 hover:bg-gray-200 transition-colors border-none"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button variant="success" className="flex-[7]" asChild>
                <Link href={'/checkout'}>Ir a pagar</Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
