import { describe, expect, it } from 'vitest'
import { buildGiftCollectionBackfill } from '@/scripts/migrate-gift-collections'

describe('gift collection migration', () => {
  it('moves legacy giftlist links to both sides of the many-to-many relation', () => {
    const result = buildGiftCollectionBackfill(
      [
        { _id: 'gift-1', giftlistId: 'giftlist-1' },
        {
          _id: 'gift-2',
          giftlistIds: ['giftlist-1', 'giftlist-2', 'giftlist-2'],
        },
        { _id: 'gift-3', giftlistId: 'missing-giftlist' },
      ],
      [{ _id: 'giftlist-1' }, { _id: 'giftlist-2' }]
    )

    expect(result.giftUpdates).toEqual([
      { giftId: 'gift-1', giftlistIds: ['giftlist-1'] },
      {
        giftId: 'gift-2',
        giftlistIds: ['giftlist-1', 'giftlist-2'],
      },
      { giftId: 'gift-3', giftlistIds: [] },
    ])
    expect(result.giftlistUpdates).toEqual([
      { giftlistId: 'giftlist-1', giftIds: ['gift-1', 'gift-2'] },
      { giftlistId: 'giftlist-2', giftIds: ['gift-2'] },
    ])
  })
})
