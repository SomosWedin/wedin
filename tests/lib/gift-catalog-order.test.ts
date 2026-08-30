import { describe, expect, it } from 'vitest'

import { getVisibleWishlistGifts } from '@/components/guest/gift-catalog-order'

type TestWishlistGift = {
  id: string
  isFavoriteGift: boolean
  isFullyPaid: boolean
  isManuallyReceived: boolean
  isGroupGift: boolean
  quantity: number
  gift: { name: string; price: string }
  transactions: { amount: string; quantity: number }[]
}

function makeGift(
  id: string,
  overrides: Partial<TestWishlistGift> = {}
): TestWishlistGift {
  return {
    id,
    isFavoriteGift: false,
    isFullyPaid: false,
    isManuallyReceived: false,
    isGroupGift: false,
    quantity: 1,
    gift: { name: id, price: '100000' },
    transactions: [],
    ...overrides,
  }
}

const defaultOptions = {
  typeFilter: 'todos',
  search: '',
  sort: 'recent',
} as const

function idsOf(wishlistGifts: TestWishlistGift[]) {
  return wishlistGifts.map(wishlistGift => wishlistGift.id)
}

describe('getVisibleWishlistGifts', () => {
  it('moves already-gifted gifts to the end', () => {
    const gifts = [
      makeGift('paid', { isFullyPaid: true }),
      makeGift('available'),
      makeGift('received', { isManuallyReceived: true }),
      makeGift('other'),
    ]

    expect(idsOf(getVisibleWishlistGifts(gifts, defaultOptions))).toEqual([
      'available',
      'other',
      'paid',
      'received',
    ])
  })

  it('treats a sold-out gift as already gifted', () => {
    const gifts = [
      makeGift('sold-out', {
        quantity: 2,
        transactions: [{ amount: '200000', quantity: 2 }],
      }),
      makeGift('in-stock', {
        quantity: 2,
        transactions: [{ amount: '100000', quantity: 1 }],
      }),
    ]

    expect(idsOf(getVisibleWishlistGifts(gifts, defaultOptions))).toEqual([
      'in-stock',
      'sold-out',
    ])
  })

  it('treats a fully funded group gift as already gifted', () => {
    const gifts = [
      makeGift('funded', {
        isGroupGift: true,
        transactions: [{ amount: '100000', quantity: 1 }],
      }),
      makeGift('partially-funded', {
        isGroupGift: true,
        transactions: [{ amount: '40000', quantity: 1 }],
      }),
    ]

    expect(idsOf(getVisibleWishlistGifts(gifts, defaultOptions))).toEqual([
      'partially-funded',
      'funded',
    ])
  })

  it('puts favorite gifts first', () => {
    const gifts = [
      makeGift('plain'),
      makeGift('favorite', { isFavoriteGift: true }),
      makeGift('another-plain'),
    ]

    expect(idsOf(getVisibleWishlistGifts(gifts, defaultOptions))).toEqual([
      'favorite',
      'plain',
      'another-plain',
    ])
  })

  it('keeps an already-gifted favorite below every available gift', () => {
    const gifts = [
      makeGift('paid-favorite', { isFavoriteGift: true, isFullyPaid: true }),
      makeGift('available-plain'),
    ]

    expect(idsOf(getVisibleWishlistGifts(gifts, defaultOptions))).toEqual([
      'available-plain',
      'paid-favorite',
    ])
  })

  it('applies the price sort inside each tier', () => {
    const gifts = [
      makeGift('cheap-paid', {
        gift: { name: 'a', price: '10' },
        isFullyPaid: true,
      }),
      makeGift('expensive', { gift: { name: 'b', price: '300' } }),
      makeGift('cheap', { gift: { name: 'c', price: '100' } }),
      makeGift('cheap-favorite', {
        gift: { name: 'd', price: '200' },
        isFavoriteGift: true,
      }),
    ]

    expect(
      idsOf(
        getVisibleWishlistGifts(gifts, { ...defaultOptions, sort: 'price-asc' })
      )
    ).toEqual(['cheap-favorite', 'cheap', 'expensive', 'cheap-paid'])

    expect(
      idsOf(
        getVisibleWishlistGifts(gifts, {
          ...defaultOptions,
          sort: 'price-desc',
        })
      )
    ).toEqual(['cheap-favorite', 'expensive', 'cheap', 'cheap-paid'])
  })

  it('preserves the incoming order within a tier when sorting by "recent"', () => {
    const gifts = [makeGift('first'), makeGift('second'), makeGift('third')]

    expect(idsOf(getVisibleWishlistGifts(gifts, defaultOptions))).toEqual([
      'first',
      'second',
      'third',
    ])
  })

  it('filters by availability', () => {
    const gifts = [
      makeGift('paid', { isFullyPaid: true }),
      makeGift('available'),
    ]

    expect(
      idsOf(
        getVisibleWishlistGifts(gifts, {
          ...defaultOptions,
          typeFilter: 'disponibles',
        })
      )
    ).toEqual(['available'])

    expect(
      idsOf(
        getVisibleWishlistGifts(gifts, {
          ...defaultOptions,
          typeFilter: 'regalados',
        })
      )
    ).toEqual(['paid'])
  })

  it('matches the search term regardless of case and surrounding spaces', () => {
    const gifts = [
      makeGift('juego-de-sabanas', {
        gift: { name: 'Juego de Sábanas', price: '100' },
      }),
      makeGift('licuadora', { gift: { name: 'Licuadora', price: '100' } }),
    ]

    expect(
      idsOf(
        getVisibleWishlistGifts(gifts, {
          ...defaultOptions,
          search: '  LICUA ',
        })
      )
    ).toEqual(['licuadora'])
  })

  it('does not mutate the gifts it was given', () => {
    const gifts = [
      makeGift('paid', { isFullyPaid: true }),
      makeGift('available'),
    ]

    getVisibleWishlistGifts(gifts, defaultOptions)

    expect(idsOf(gifts)).toEqual(['paid', 'available'])
  })
})
