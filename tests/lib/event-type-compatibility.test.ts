import { describe, expect, it } from 'vitest'
import {
  eventTypeIdsOverlap,
  filterByEventTypeIds,
  includesEveryEventType,
  intersectEventTypeIds,
} from '@/lib/event-type-compatibility'

describe('event type compatibility', () => {
  it('filters gifts to categories supporting every selected event type', () => {
    const gifts = [
      { id: 'gift-wedding', eventTypeIds: ['wedding'] },
      { id: 'gift-shared', eventTypeIds: ['wedding', 'baby-shower'] },
      { id: 'gift-baby', eventTypeIds: ['baby-shower'] },
    ]

    expect(
      filterByEventTypeIds(gifts, ['wedding']).map(gift => gift.id)
    ).toEqual(['gift-wedding', 'gift-shared'])
    expect(
      filterByEventTypeIds(gifts, ['wedding', 'baby-shower']).map(
        gift => gift.id
      )
    ).toEqual(['gift-shared'])
    expect(filterByEventTypeIds(gifts, [])).toEqual([])
  })

  it('requires a category to contain every selected event type', () => {
    expect(
      includesEveryEventType(
        ['wedding', 'baby-shower', 'birthday'],
        ['wedding', 'baby-shower']
      )
    ).toBe(true)
    expect(
      includesEveryEventType(['wedding'], ['wedding', 'baby-shower'])
    ).toBe(false)
  })

  it('returns only event types shared by every group', () => {
    expect(
      intersectEventTypeIds([
        ['wedding', 'baby-shower'],
        ['baby-shower', 'birthday'],
      ])
    ).toEqual(['baby-shower'])
  })

  it('detects whether two event type sets overlap', () => {
    expect(
      eventTypeIdsOverlap(['wedding', 'baby-shower'], ['baby-shower'])
    ).toBe(true)
    expect(eventTypeIdsOverlap(['wedding'], ['baby-shower'])).toBe(false)
  })
})
