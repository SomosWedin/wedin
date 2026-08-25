import { describe, expect, it } from 'vitest'
import { isGiftComplete } from '@/components/guest/gift-progress'

type WishlistGiftArgs = Parameters<typeof isGiftComplete>[0]

function buildWishlistGift(
  overrides: Partial<WishlistGiftArgs> = {}
): WishlistGiftArgs {
  return {
    isFullyPaid: false,
    isManuallyReceived: false,
    isGroupGift: false,
    quantity: 1,
    gift: { price: '100000' },
    transactions: [],
    ...overrides,
  }
}

describe('isGiftComplete', () => {
  it('treats an untouched individual gift as available', () => {
    expect(isGiftComplete(buildWishlistGift())).toBe(false)
  })

  it('treats an individual gift with no stock left as complete', () => {
    const wishlistGift = buildWishlistGift({
      quantity: 2,
      transactions: [
        { amount: '100000', quantity: 1 },
        { amount: '100000', quantity: 1 },
      ],
    })

    expect(isGiftComplete(wishlistGift)).toBe(true)
  })

  it('keeps an individual gift with stock left as available', () => {
    const wishlistGift = buildWishlistGift({
      quantity: 3,
      transactions: [{ amount: '100000', quantity: 1 }],
    })

    expect(isGiftComplete(wishlistGift)).toBe(false)
  })

  it('keeps a partially funded group gift as available', () => {
    const wishlistGift = buildWishlistGift({
      isGroupGift: true,
      transactions: [{ amount: '40000', quantity: 1 }],
    })

    expect(isGiftComplete(wishlistGift)).toBe(false)
  })

  it('treats a fully funded group gift as complete', () => {
    const wishlistGift = buildWishlistGift({
      isGroupGift: true,
      transactions: [
        { amount: '60000', quantity: 1 },
        { amount: '40000', quantity: 1 },
      ],
    })

    expect(isGiftComplete(wishlistGift)).toBe(true)
  })

  it('treats a group gift without a price as available', () => {
    const wishlistGift = buildWishlistGift({
      isGroupGift: true,
      gift: { price: '0' },
    })

    expect(isGiftComplete(wishlistGift)).toBe(false)
  })

  it('honours isFullyPaid and isManuallyReceived', () => {
    expect(isGiftComplete(buildWishlistGift({ isFullyPaid: true }))).toBe(true)
    expect(
      isGiftComplete(buildWishlistGift({ isManuallyReceived: true }))
    ).toBe(true)
  })
})
