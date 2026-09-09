import { describe, expect, it } from 'vitest'
import { getOnboardingDefaults } from '@/lib/onboarding-defaults'

const user = (onboardingStep: number) => ({
  name: 'Maria',
  lastName: 'Pérez',
  onboardingStep,
})

const event = (
  overrides: Partial<{
    country: string | null
    city: string | null
    date: Date | null
    users: {
      name: string | null
      lastName: string | null
      isPrimary: boolean
    }[]
  }> = {}
) => ({
  country: null,
  city: null,
  date: null,
  users: [{ name: 'Maria', lastName: 'Pérez', isPrimary: true }],
  ...overrides,
})

describe('onboarding defaults', () => {
  it('prefills the profile from the user and the partner row', () => {
    const defaults = getOnboardingDefaults(
      user(5),
      event({
        users: [
          { name: 'Maria', lastName: 'Pérez', isPrimary: true },
          { name: 'Juan', lastName: 'González', isPrimary: false },
        ],
      })
    )

    expect(defaults.name).toBe('Maria')
    expect(defaults.partnerName).toBe('Juan')
    expect(defaults.partnerLastName).toBe('González')
  })

  it('leaves the partner blank when there is none', () => {
    const defaults = getOnboardingDefaults(user(5), event())

    expect(defaults.partnerName).toBe('')
  })

  it('prefills a saved location and date', () => {
    const date = new Date('2027-05-01')
    const defaults = getOnboardingDefaults(
      user(5),
      event({ country: 'Argentina', city: 'Salta', date })
    )

    expect(defaults.eventCountry).toBe('Argentina')
    expect(defaults.eventCity).toBe('Salta')
    expect(defaults.eventDate).toBe(date)
    expect(defaults.isDecidingEventLocation).toBe(false)
    expect(defaults.isDecidingEventDate).toBe(false)
  })

  it('infers "aún estamos decidiendo" once the step has been passed with nothing saved', () => {
    const defaults = getOnboardingDefaults(user(5), event())

    expect(defaults.isDecidingEventLocation).toBe(true)
    expect(defaults.isDecidingEventDate).toBe(true)
  })

  it('does not pre-tick the boxes for a user who has not reached those steps', () => {
    const defaults = getOnboardingDefaults(user(3), event())

    expect(defaults.isDecidingEventLocation).toBe(false)
    expect(defaults.isDecidingEventDate).toBe(false)
  })

  it('does not pre-tick the date box while standing on the date step', () => {
    const defaults = getOnboardingDefaults(user(4), event())

    expect(defaults.isDecidingEventLocation).toBe(true)
    expect(defaults.isDecidingEventDate).toBe(false)
  })

  it('falls back to Paraguay when no country is stored', () => {
    const defaults = getOnboardingDefaults(user(1), event())

    expect(defaults.eventCountry).toBe('Paraguay')
  })
})
