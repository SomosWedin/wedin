import { describe, expect, it } from 'vitest'
import { classifyOrphanGifts } from '@/scripts/migrate-gift-categories'

describe('gift category migration', () => {
  it('deletes only unreferenced orphan gifts', () => {
    const result = classifyOrphanGifts(
      [
        { id: 'gift-valid', categoryId: 'category-valid' },
        { id: 'gift-orphan', categoryId: 'category-missing' },
      ],
      new Set(['category-valid']),
      []
    )

    expect(result.deletableGiftIds).toEqual(['gift-orphan'])
    expect(result.referencedOrphans).toEqual([])
  })

  it('retains and reports wishlist-linked orphan gifts', () => {
    const result = classifyOrphanGifts(
      [{ id: 'gift-orphan', categoryId: 'category-missing' }],
      new Set(),
      [
        { id: 'wishlist-gift-1', giftId: 'gift-orphan' },
        { id: 'wishlist-gift-2', giftId: 'gift-orphan' },
      ]
    )

    expect(result.deletableGiftIds).toEqual([])
    expect(result.referencedOrphans).toEqual([
      {
        giftId: 'gift-orphan',
        categoryId: 'category-missing',
        wishlistGiftIds: ['wishlist-gift-1', 'wishlist-gift-2'],
      },
    ])
  })
})
