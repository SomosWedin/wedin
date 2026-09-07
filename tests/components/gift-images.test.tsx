import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CartItemRow from '@/components/cart/cart-item-row'
import GuestGiftCard, {
  type WishlistGiftWithGift,
} from '@/components/guest/guest-gift-card'

const imageUrl = 'https://csv-gift-images.example/product.jpg?size=large'
const createdAt = new Date('2026-01-01')
const wishlistGift: WishlistGiftWithGift = {
  id: 'wishlist-gift',
  giftId: 'gift',
  wishlistId: 'wishlist',
  eventId: 'event',
  isFavoriteGift: false,
  isGroupGift: false,
  groupGiftParts: '0',
  isFullyPaid: false,
  isManuallyReceived: false,
  isReceived: false,
  reservedAmount: 0,
  reservedQuantity: 0,
  quantity: 1,
  createdAt,
  updatedAt: createdAt,
  transactions: [],
  gift: {
    id: 'gift',
    name: 'Cuna',
    nameScopeKey: 'cuna',
    price: '100000',
    isDefault: true,
    categoryId: 'category',
    giftlistIds: [],
    eventId: null,
    createdAt,
    updatedAt: createdAt,
    image: {
      id: 'image',
      url: imageUrl,
      giftId: 'gift',
      eventId: null,
      createdAt,
      updatedAt: createdAt,
    },
  },
}

describe('imported gift images', () => {
  it('renders a guest gift image from an unconfigured CSV host directly', () => {
    const html = renderToStaticMarkup(
      <GuestGiftCard
        wishlistGift={wishlistGift}
        isInCart={false}
        onAddFullPrice={() => {}}
        onOpenContributionDialog={() => {}}
        onOpenGiftDetails={() => {}}
      />
    )

    expect(html).toContain(`src="${imageUrl}"`)
    expect(html).not.toContain('/_next/image')
    expect(html).toContain('alt="Cuna"')
  })

  it('keeps the imported image directly accessible after adding it to the cart', () => {
    const html = renderToStaticMarkup(
      <CartItemRow
        item={{
          id: 'cart-item',
          wishlistGiftId: wishlistGift.id,
          giftName: 'Cuna',
          giftImageUrl: imageUrl,
          amount: '100000',
          unitPrice: '100000',
          quantity: 1,
          isGroupGift: false,
        }}
        onRemove={() => {}}
        onEdit={() => {}}
      />
    )

    expect(html).toContain(`src="${imageUrl}"`)
    expect(html).not.toContain('/_next/image')
  })
})
