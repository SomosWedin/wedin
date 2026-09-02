import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getTermsFileUrl } from '@/lib/server/terms-storage'
import {
  findTermsDocumentBySlug,
  hasAcceptedOrganizerTerms,
  TERMS_DOCUMENTS,
} from '@/lib/terms'

describe('terms document registry', () => {
  it('resolves every published slug back to its document', () => {
    expect(findTermsDocumentBySlug('organizadores')).toBe(
      TERMS_DOCUMENTS.organizers
    )
    expect(findTermsDocumentBySlug('invitados')).toBe(TERMS_DOCUMENTS.guests)
    expect(findTermsDocumentBySlug('politica-de-privacidad')).toBe(
      TERMS_DOCUMENTS.privacy
    )
  })

  it('returns null for an unknown slug', () => {
    expect(findTermsDocumentBySlug('otra-cosa')).toBeNull()
  })
})

describe('terms file URL', () => {
  beforeEach(() => {
    process.env.AWS_BUCKET = 'somos-wedin'
    process.env.AWS_BUCKET_REGION = 'us-east-2'
  })

  it('builds the public object URL from the configured bucket', () => {
    expect(getTermsFileUrl(TERMS_DOCUMENTS.organizers)).toBe(
      'https://somos-wedin.s3.us-east-2.amazonaws.com/terms/wedin-terminos-organizadores.pdf'
    )
  })

  it('fails loudly when storage is not configured', () => {
    process.env.AWS_BUCKET = ''

    expect(() => getTermsFileUrl(TERMS_DOCUMENTS.guests)).toThrow(
      'Terms storage is not configured.'
    )
  })
})

describe('organizer terms acceptance state', () => {
  it('is driven only by the recorded acceptance, not by visibility', () => {
    const acceptedAt = new Date('2026-08-30T00:00:00Z')

    expect(hasAcceptedOrganizerTerms({ termsAcceptedAt: acceptedAt })).toBe(
      true
    )
    expect(hasAcceptedOrganizerTerms({ termsAcceptedAt: null })).toBe(false)
  })
})
