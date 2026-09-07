import { describe, expect, it } from 'vitest'
import { classifyOrphanWishlistGifts } from '@/scripts/migrations/20260907233651_repair_orphan_wishlist_gifts'

const objectId = (value: string) => ({ $oid: value })

const gift = objectId('gift-1')
const event = objectId('event-1')
const healthy = objectId('wishlist-gift-healthy')
const orphanBare = objectId('wishlist-gift-orphan-bare')
const orphanPaid = objectId('wishlist-gift-orphan-paid')

describe('classifyOrphanWishlistGifts', () => {
  it('leaves wishlist gifts whose gift still exists alone', () => {
    expect(
      classifyOrphanWishlistGifts(
        [{ _id: healthy, giftId: gift, eventId: event }],
        [{ _id: gift }],
        []
      )
    ).toEqual({ deletableIds: [], archivable: [] })
  })

  it('deletes an orphan with no transactions and archives one with them', () => {
    const result = classifyOrphanWishlistGifts(
      [
        { _id: healthy, giftId: gift, eventId: event },
        { _id: orphanBare, giftId: objectId('gift-gone'), eventId: event },
        { _id: orphanPaid, giftId: objectId('gift-gone'), eventId: event },
      ],
      [{ _id: gift }],
      [
        { wishlistGiftId: orphanPaid, status: 'COMPLETED' },
        { wishlistGiftId: orphanPaid, status: 'FAILED' },
        { wishlistGiftId: healthy, status: 'COMPLETED' },
      ]
    )

    expect(result.deletableIds).toEqual([orphanBare])
    expect(result.archivable).toEqual([
      {
        wishlistGiftId: orphanPaid,
        eventId: event,
        statuses: ['COMPLETED', 'FAILED'],
      },
    ])
  })

  it('treats a wishlist gift with no giftId at all as an orphan', () => {
    const result = classifyOrphanWishlistGifts(
      [{ _id: orphanBare, eventId: event }],
      [{ _id: gift }],
      []
    )

    expect(result.deletableIds).toEqual([orphanBare])
  })

  it('is a no-op on a second run once orphans are gone', () => {
    expect(
      classifyOrphanWishlistGifts(
        [{ _id: healthy, giftId: gift, eventId: event }],
        [{ _id: gift }],
        [{ wishlistGiftId: healthy, status: 'COMPLETED' }]
      )
    ).toEqual({ deletableIds: [], archivable: [] })
  })
})
