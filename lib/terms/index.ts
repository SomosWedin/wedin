export const TERMS_PATHS = {
  organizers: '/bases-y-condiciones/organizadores',
  guests: '/bases-y-condiciones/invitados',
} as const

export function hasAcceptedOrganizerTerms(event: {
  termsAcceptedAt: Date | null
  isPublished: boolean
}) {
  return event.termsAcceptedAt !== null || event.isPublished
}

export { GUEST_TERMS } from './guest-terms'
export { ORGANIZER_TERMS } from './organizer-terms'
export type { TermsBlock, TermsDocument, TermsSection } from './types'
