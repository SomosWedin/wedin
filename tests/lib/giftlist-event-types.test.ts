import { describe, expect, it } from 'vitest'
import { deriveGiftlistEventTypeIds } from '@/lib/giftlist-event-types'

describe('deriveGiftlistEventTypeIds', () => {
  it('returns the event types shared by every gift category', () => {
    expect(
      deriveGiftlistEventTypeIds([
        { category: { eventTypeIds: ['wedding', 'birthday'] } },
        { category: { eventTypeIds: ['wedding', 'baby-shower'] } },
      ])
    ).toEqual(['wedding'])
  })

  it('returns no event types for an empty collection', () => {
    expect(deriveGiftlistEventTypeIds([])).toEqual([])
  })

  it('returns no event types when gift categories have no type in common', () => {
    expect(
      deriveGiftlistEventTypeIds([
        { category: { eventTypeIds: ['wedding'] } },
        { category: { eventTypeIds: ['birthday'] } },
      ])
    ).toEqual([])
  })
})
