import { describe, expect, it } from 'vitest'
import { deriveGiftlistEventTypeIds } from '@/lib/giftlist-event-types'

describe('deriveGiftlistEventTypeIds', () => {
  it('returns all event types assigned to the gift categories', () => {
    expect(
      deriveGiftlistEventTypeIds([
        { category: { eventTypeIds: ['wedding', 'birthday'] } },
        { category: { eventTypeIds: ['wedding', 'baby-shower'] } },
      ])
    ).toEqual(['wedding', 'birthday', 'baby-shower'])
  })

  it('returns no event types for an empty collection', () => {
    expect(deriveGiftlistEventTypeIds([])).toEqual([])
  })

  it('deduplicates event types shared by multiple gift categories', () => {
    expect(
      deriveGiftlistEventTypeIds([
        { category: { eventTypeIds: ['wedding'] } },
        { category: { eventTypeIds: ['birthday'] } },
      ])
    ).toEqual(['wedding', 'birthday'])
  })
})
