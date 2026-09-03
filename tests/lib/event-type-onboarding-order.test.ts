import { describe, expect, it } from 'vitest'
import { sortEventTypesForOnboarding } from '@/lib/event-type'
import { getEventTypeIcon } from '@/lib/event-type-icons'

describe('onboarding event type ordering', () => {
  const eventTypes = [
    { key: 'fkdsjflsdjakf', name: '15 años' },
    { key: 'baby-shower', name: 'Baby Shower' },
    { key: 'wedding', name: 'Casamiento' },
    { key: 'other', name: 'Cumpleaños' },
    { key: 'otro', name: 'Otros' },
  ]

  it('puts the wedding type first and sorts the rest by name', () => {
    expect(
      sortEventTypesForOnboarding(eventTypes).map(type => type.name)
    ).toEqual(['Casamiento', '15 años', 'Baby Shower', 'Cumpleaños', 'Otros'])
  })

  it('does not mutate the input', () => {
    const input = [...eventTypes]
    sortEventTypesForOnboarding(input)
    expect(input.map(type => type.name)).toEqual(
      eventTypes.map(type => type.name)
    )
  })

  it('keeps ordering stable when no wedding type exists', () => {
    const withoutWedding = eventTypes.filter(type => type.key !== 'wedding')
    expect(
      sortEventTypesForOnboarding(withoutWedding).map(type => type.name)
    ).toEqual(['15 años', 'Baby Shower', 'Cumpleaños', 'Otros'])
  })
})

describe('onboarding event type icons', () => {
  it('resolves a distinct icon for the known system keys', () => {
    expect(getEventTypeIcon('wedding')).not.toBe(getEventTypeIcon('other'))
    expect(getEventTypeIcon('baby-shower')).not.toBe(
      getEventTypeIcon('wedding')
    )
  })

  it('falls back to a generic icon for admin-created keys', () => {
    expect(getEventTypeIcon('fkdsjflsdjakf')).toBe(getEventTypeIcon('otro'))
  })
})
