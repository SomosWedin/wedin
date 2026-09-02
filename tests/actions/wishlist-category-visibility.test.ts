import type { ReactElement } from 'react'
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

type Props = Record<string, unknown>

function findPropsWith(node: unknown, key: string): Props | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findPropsWith(child, key)
      if (found) return found
    }
    return null
  }
  const element = node as ReactElement<Props>
  const props = element.props
  if (props && typeof props === 'object') {
    if (key in props) return props
    return findPropsWith((props as { children?: unknown }).children, key)
  }
  return null
}

const weddingCategory = {
  id: 'category-wedding',
  name: 'Luna de miel',
  normalizedName: 'luna de miel',
  eventTypeIds: ['event-type-wedding'],
}

const gift = {
  id: 'wishlist-gift-1',
  giftId: 'gift-1',
  isReceived: false,
  gift: {
    id: 'gift-1',
    categoryId: 'category-wedding',
    category: weddingCategory,
  },
}

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

  it('passes only the scoped categories down to the wishlist list', async () => {
    mocks.getEvent.mockResolvedValue({
      id: 'event-1',
      wishlistId: 'wishlist-1',
      eventTypeId: 'event-type-wedding',
    })
    mocks.getWishlistGifts.mockResolvedValue([gift])
    mocks.getCategories.mockResolvedValue([weddingCategory])

    const tree = await DashboardWishlist()
    const listProps = findPropsWith(tree, 'wishlistGifts')

    expect(listProps).not.toBeNull()
    expect(listProps?.categories).toEqual([weddingCategory])
  })
})
