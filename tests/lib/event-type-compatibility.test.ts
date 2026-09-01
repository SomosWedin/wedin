import { describe, expect, it } from 'vitest'
import {
  eventTypeIdsOverlap,
  includesEveryEventType,
  intersectEventTypeIds,
} from '@/lib/event-type-compatibility'

describe('event type compatibility', () => {
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
