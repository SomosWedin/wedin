import { describe, expect, it } from 'vitest'
import { buildGiftlistGiftIdRepair } from '@/scripts/migrations/20260830143000_rebuild_giftlist_gift_ids'

const objectId = (value: string) => ({ $oid: value })

describe('buildGiftlistGiftIdRepair', () => {
  it('rebuilds collection gifts exclusively from valid gift-side links', () => {
    const listOne = objectId('list-1')
    const listTwo = objectId('list-2')
    const missingList = objectId('list-missing')
    const giftOne = objectId('gift-1')
    const giftTwo = objectId('gift-2')

    expect(
      buildGiftlistGiftIdRepair(
        [
          {
            _id: giftOne,
            giftlistIds: [listOne, listOne, missingList],
          },
          { _id: giftTwo, giftlistIds: [] },
        ],
        [{ _id: listOne }, { _id: listTwo }]
      )
    ).toEqual({
      giftUpdates: [
        { giftId: giftOne, giftlistIds: [listOne] },
        { giftId: giftTwo, giftlistIds: [] },
      ],
      giftlistUpdates: [
        { giftlistId: listOne, giftIds: [giftOne] },
        { giftlistId: listTwo, giftIds: [] },
      ],
    })
  })
})
