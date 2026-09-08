import type { Event, User } from '@prisma/client'

export type OnboardingDefaults = {
  name: string
  lastName: string
  partnerName: string
  partnerLastName: string
  eventCountry: string
  eventCity: string
  eventDate: Date | undefined
  isDecidingEventLocation: boolean
  isDecidingEventDate: boolean
}

type OnboardingUser = Pick<User, 'name' | 'lastName' | 'onboardingStep'>

type OnboardingEvent = Pick<Event, 'country' | 'city' | 'date'> & {
  users: Pick<User, 'name' | 'lastName' | 'isPrimary'>[]
}

export function getOnboardingDefaults(
  user: OnboardingUser,
  event: OnboardingEvent | null
): OnboardingDefaults {
  const partner = event?.users.find(eventUser => !eventUser.isPrimary)
  const furthestStep = user.onboardingStep || 1

  return {
    name: user.name ?? '',
    lastName: user.lastName ?? '',
    partnerName: partner?.name ?? '',
    partnerLastName: partner?.lastName ?? '',
    eventCountry: event?.country || 'Paraguay',
    eventCity: event?.city ?? '',
    eventDate: event?.date ?? undefined,
    // "Aún estamos decidiendo" is not persisted, so it is inferred: past the
    // step with nothing stored is the only way those fields end up empty.
    isDecidingEventLocation:
      furthestStep > 3 && !event?.country && !event?.city,
    isDecidingEventDate: furthestStep > 4 && !event?.date,
  }
}
