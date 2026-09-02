import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getEvent: vi.fn(),
  getCategories: vi.fn(),
  getWishlistGifts: vi.fn(),
}))

vi.mock('@/actions/data/event', () => ({ getEvent: mocks.getEvent }))

vi.mock('@/actions/data/category', () => ({
  getCategories: mocks.getCategories,
}))

vi.mock('@/actions/data/wishlist-gift', () => ({
  getWishlistGifts: mocks.getWishlistGifts,
}))

import DashboardWishlist from '@/components/dashboard/dashboard-wishlist'

describe('wishlist category visibility', () => {
  it('scopes the organizer wishlist categories to the event type', async () => {
    mocks.getEvent.mockResolvedValue({
      id: 'event-1',
      wishlistId: 'wishlist-1',
      eventTypeId: 'event-type-wedding',
    })
    mocks.getWishlistGifts.mockResolvedValue([])
    mocks.getCategories.mockResolvedValue([])

    await DashboardWishlist()

    expect(mocks.getCategories).toHaveBeenCalledWith('event-type-wedding')
  })
})
