'use client'

import type { Category } from '@prisma/client'
import { useState } from 'react'
import {
  IoGiftOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoSearchOutline,
} from 'react-icons/io5'
import CartDrawer from '@/components/cart/cart-drawer'
import CartStickyBar from '@/components/cart/cart-sticky-bar'
import GiftContributionDialog from '@/components/dialog/gift-contribution-dialog'
import GiftDetailDialog from '@/components/dialog/gift-detail-dialog'
import {
  getGiftProgress,
  getQuantityProgress,
} from '@/components/guest/gift-progress'
import GuestGiftCard, {
  type WishlistGiftWithGift,
} from '@/components/guest/guest-gift-card'
import { Input } from '@/components/ui/input'
import { type CartItem, useCartStore } from '@/hooks/use-cart-store'
import { useStore } from '@/hooks/use-store'
import { useToast } from '@/hooks/use-toast'

type TypeFilter = 'todos' | 'individual' | 'grupal'
type SortOption = 'recent' | 'price-asc' | 'price-desc'

type GuestGiftCatalogProps = {
  eventId: string
  wishlistGifts: WishlistGiftWithGift[]
  categories: Category[]
}

const TYPE_FILTERS: {
  value: TypeFilter
  label: string
  icon: React.ReactNode
}[] = [
  { value: 'todos', label: 'Todos', icon: <IoGiftOutline /> },
  {
    value: 'individual',
    label: 'Regalo individual',
    icon: <IoPersonOutline />,
  },
  { value: 'grupal', label: 'Regalo grupal', icon: <IoPeopleOutline /> },
]

export default function GuestGiftCatalog({
  eventId,
  wishlistGifts,
  categories,
}: GuestGiftCatalogProps) {
  const { toast } = useToast()
  const cartStore = useCartStore(eventId)
  const cartItems = useStore(cartStore, state => state.items) ?? []
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState<SortOption>('recent')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedWishlistGift, setSelectedWishlistGift] =
    useState<WishlistGiftWithGift | null>(null)
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null)
  const [detailWishlistGift, setDetailWishlistGift] =
    useState<WishlistGiftWithGift | null>(null)

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )
  const cartWishlistGiftIds = new Set(
    cartItems.map(item => item.wishlistGiftId)
  )

  const addToCart = (
    wishlistGift: WishlistGiftWithGift,
    amount: string,
    quantity: number = 1
  ) => {
    cartStore.getState().addItem({
      wishlistGiftId: wishlistGift.id,
      giftName: wishlistGift.gift.name,
      giftImageUrl: wishlistGift.gift.image?.url ?? null,
      isGroupGift: wishlistGift.isGroupGift,
      amount,
      quantity,
      unitPrice: wishlistGift.gift.price,
    })
    toast({
      title: 'Agregado al carrito 🎁',
      description: `${wishlistGift.gift.name} — Gs. ${Number(
        amount
      ).toLocaleString('es-PY')}`,
    })
  }

  const handleAddToCart = (
    wishlistGift: WishlistGiftWithGift,
    quantity: number
  ) => {
    const amount = String(Number(wishlistGift.gift.price) * quantity)
    addToCart(wishlistGift, amount, quantity)
  }

  const handleOpenContributionDialog = (wishlistGift: WishlistGiftWithGift) => {
    setSelectedWishlistGift(wishlistGift)
  }

  const handleOpenGiftDetails = (wishlistGift: WishlistGiftWithGift) => {
    // Reopening an already-in-cart gift edits that line instead of adding a duplicate.
    const existingCartItem = cartItems.find(
      item => item.wishlistGiftId === wishlistGift.id
    )
    setEditingCartItem(existingCartItem ?? null)
    setDetailWishlistGift(wishlistGift)
  }

  const handleEditCartItem = (item: CartItem) => {
    const wishlistGift = wishlistGifts.find(
      candidate => candidate.id === item.wishlistGiftId
    )
    if (!wishlistGift) return

    setEditingCartItem(item)
    if (item.isGroupGift) {
      setSelectedWishlistGift(wishlistGift)
    } else {
      setDetailWishlistGift(wishlistGift)
    }
    setIsCartOpen(false)
  }

  const handleContributionSubmit = (amount: string) => {
    if (!selectedWishlistGift) return

    if (editingCartItem) {
      cartStore.getState().updateItemAmount(editingCartItem.id, amount)
    } else {
      addToCart(selectedWishlistGift, amount)
    }
  }

  const handleContributionDialogOpenChange = (open: boolean) => {
    if (open) return

    setSelectedWishlistGift(null)
    if (editingCartItem) {
      setEditingCartItem(null)
      setIsCartOpen(true)
    }
  }

  const handleDetailConfirm = (quantity: number) => {
    if (!detailWishlistGift) return

    if (editingCartItem) {
      cartStore.getState().updateItemQuantity(editingCartItem.id, quantity)
    } else {
      handleAddToCart(detailWishlistGift, quantity)
    }
  }

  const handleDetailDialogOpenChange = (open: boolean) => {
    if (open) return

    setDetailWishlistGift(null)
    if (editingCartItem) {
      setEditingCartItem(null)
      setIsCartOpen(true)
    }
  }

  const handleRemoveCartItem = (id: string) => {
    cartStore.getState().removeItem(id)
    if (cartItems.length === 1) setIsCartOpen(false)
  }

  const filteredWishlistGifts = wishlistGifts
    .filter(wishlistGift => {
      const matchesType =
        typeFilter === 'todos' ||
        (typeFilter === 'grupal'
          ? wishlistGift.isGroupGift
          : !wishlistGift.isGroupGift)
      const matchesSearch = wishlistGift.gift.name
        .toLowerCase()
        .includes(search.trim().toLowerCase())
      const matchesCategory =
        !categoryFilter || wishlistGift.gift.categoryId === categoryFilter

      return matchesType && matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sort === 'price-asc')
        return Number(a.gift.price) - Number(b.gift.price)
      if (sort === 'price-desc')
        return Number(b.gift.price) - Number(a.gift.price)
      return 0
    })

  const selectedProgress = selectedWishlistGift
    ? getGiftProgress(
        selectedWishlistGift.gift.price,
        selectedWishlistGift.transactions
      )
    : null

  const detailProgress = detailWishlistGift
    ? getQuantityProgress(
        detailWishlistGift.quantity,
        detailWishlistGift.transactions
      )
    : null

  return (
    <section
      id="lista-de-regalos"
      className={`px-4 py-8 sm:py-12 mx-auto max-w-7xl sm:px-6 lg:px-8 ${
        cartItems.length > 0 ? 'mb-12 sm:mb-10' : ''
      }`}
    >
      <h2 className="mb-6 text-3xl font-medium">Lista de regalos</h2>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {TYPE_FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              className={`flex gap-2 items-center px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium border transition-colors ${
                typeFilter === filter.value
                  ? 'bg-gray100 text-textPrimary border-gray-200'
                  : 'bg-white text-textPrimary border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Regalo"
              className="pl-10"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
          >
            <option value="">Categoría: Todas</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
            value={sort}
            onChange={event => setSort(event.target.value as SortOption)}
          >
            <option value="recent">Ordenar por</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>

      {filteredWishlistGifts.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          No se encontraron regalos
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {filteredWishlistGifts.map(wishlistGift => (
            <GuestGiftCard
              key={wishlistGift.id}
              wishlistGift={wishlistGift}
              isInCart={cartWishlistGiftIds.has(wishlistGift.id)}
              onAddFullPrice={gift => handleAddToCart(gift, 1)}
              onOpenContributionDialog={handleOpenContributionDialog}
              onOpenGiftDetails={handleOpenGiftDetails}
            />
          ))}
        </div>
      )}

      {selectedWishlistGift && selectedProgress && (
        <GiftContributionDialog
          open={!!selectedWishlistGift}
          onOpenChange={handleContributionDialogOpenChange}
          gift={selectedWishlistGift.gift}
          isFavoriteGift={selectedWishlistGift.isFavoriteGift}
          remaining={selectedProgress.remaining}
          percentage={selectedProgress.percentage}
          onAddToCart={handleContributionSubmit}
          initialAmount={editingCartItem?.amount}
        />
      )}

      {detailWishlistGift && detailProgress && (
        <GiftDetailDialog
          open={!!detailWishlistGift}
          onOpenChange={handleDetailDialogOpenChange}
          gift={detailWishlistGift.gift}
          isFavoriteGift={detailWishlistGift.isFavoriteGift}
          totalQuantity={detailWishlistGift.quantity}
          remainingStock={detailProgress.remainingStock}
          initialQuantity={editingCartItem?.quantity}
          onConfirm={handleDetailConfirm}
        />
      )}

      <CartStickyBar
        itemCount={cartItems.length}
        total={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
      />
      <CartDrawer
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        items={cartItems}
        total={cartTotal}
        onRemoveItem={handleRemoveCartItem}
        onEditItem={handleEditCartItem}
      />
    </section>
  )
}
