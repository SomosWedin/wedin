import { describe, expect, it } from 'vitest'
import {
  SYSTEM_EVENT_TYPES,
  sortEventTypesForOnboarding,
} from '@/lib/event-type'
import { getEventTypeIcon } from '@/lib/event-type-icons'

describe('onboarding event type ordering', () => {
  const eventTypes = [
    { key: 'sweet-15', name: '15 años' },
    { key: 'baby-shower', name: 'Baby shower' },
    { key: 'wedding', name: 'Casamiento' },
    { key: 'birthday', name: 'Cumpleaños' },
    { key: 'other', name: 'Otro tipo de evento' },
  ]

  it('puts the wedding type first and sorts the rest by name', () => {
    expect(
      sortEventTypesForOnboarding(eventTypes).map(type => type.name)
    ).toEqual([
      'Casamiento',
      '15 años',
      'Baby shower',
      'Cumpleaños',
      'Otro tipo de evento',
    ])
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
    ).toEqual(['15 años', 'Baby shower', 'Cumpleaños', 'Otro tipo de evento'])
  })
})

describe('onboarding event type icons', () => {
  const fallbackIcon = getEventTypeIcon('an-admin-created-key')

  it('resolves a dedicated icon for every system event type', () => {
    for (const eventType of Object.values(SYSTEM_EVENT_TYPES)) {
      expect(getEventTypeIcon(eventType.key)).not.toBe(fallbackIcon)
    }
  })

  it('gives each system event type a distinct icon', () => {
    const icons = Object.values(SYSTEM_EVENT_TYPES).map(eventType =>
      getEventTypeIcon(eventType.key)
    )
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('falls back to a generic icon for admin-created keys', () => {
    expect(getEventTypeIcon('fkdsjflsdjakf')).toBe(fallbackIcon)
  })
})
