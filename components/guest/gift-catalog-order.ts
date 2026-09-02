import {
  type CompletableWishlistGift,
  isGiftComplete,
} from '@/components/guest/gift-progress'

export type GiftTypeFilter = 'todos' | 'disponibles' | 'regalados'
export type GiftSortOption = 'recent' | 'price-asc' | 'price-desc'

type OrderableWishlistGift = CompletableWishlistGift & {
  isFavoriteGift: boolean
  gift: { name: string }
}

type VisibleWishlistGiftsOptions = {
  typeFilter: GiftTypeFilter
  search: string
  sort: GiftSortOption
}

export function getVisibleWishlistGifts<T extends OrderableWishlistGift>(
  wishlistGifts: T[],
  { typeFilter, search, sort }: VisibleWishlistGiftsOptions
): T[] {
  const searchTerm = search.trim().toLowerCase()

  return wishlistGifts
    .map(wishlistGift => ({
      wishlistGift,
      isComplete: isGiftComplete(wishlistGift),
    }))
    .filter(({ wishlistGift, isComplete }) => {
      const matchesType =
        typeFilter === 'todos' ||
        (typeFilter === 'regalados' ? isComplete : !isComplete)
      const matchesSearch = wishlistGift.gift.name
        .toLowerCase()
        .includes(searchTerm)

      return matchesType && matchesSearch
    })
    .sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1

      const aIsFavorite = a.wishlistGift.isFavoriteGift
      const bIsFavorite = b.wishlistGift.isFavoriteGift
      if (sort === 'recent' && aIsFavorite !== bIsFavorite)
        return aIsFavorite ? -1 : 1

      const aPrice = Number(a.wishlistGift.gift.price) || 0
      const bPrice = Number(b.wishlistGift.gift.price) || 0
      if (sort === 'price-asc') return aPrice - bPrice
      if (sort === 'price-desc') return bPrice - aPrice

      return 0
    })
    .map(({ wishlistGift }) => wishlistGift)
}
