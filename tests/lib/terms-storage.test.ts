import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
  S3Client: class {
    send = mocks.send
  },
}))

import { getTermsFileStream } from '@/lib/server/terms-storage'
import {
  findTermsDocumentBySlug,
  getTermsPdfPath,
  hasAcceptedOrganizerTerms,
  TERMS_DOCUMENTS,
  TERMS_PATHS,
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

describe('terms file stream', () => {
  const originalBucket = process.env.AWS_BUCKET

  beforeEach(() => {
    process.env.AWS_BUCKET = 'somos-wedin'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.AWS_BUCKET = originalBucket
  })

  it('streams the object identified by the registry', async () => {
    const stream = Symbol('stream')
    mocks.send.mockResolvedValue({
      Body: { transformToWebStream: () => stream },
    })

    await expect(getTermsFileStream(TERMS_DOCUMENTS.organizers)).resolves.toBe(
      stream
    )

    expect(mocks.send.mock.calls[0][0].input).toEqual({
      Bucket: 'somos-wedin',
      Key: 'terms/wedin-terminos-organizadores.pdf',
    })
  })

  it('returns nothing when the object cannot be read', async () => {
    mocks.send.mockRejectedValue(new Error('NoSuchKey'))

    await expect(getTermsFileStream(TERMS_DOCUMENTS.guests)).resolves.toBeNull()
  })

  it('returns nothing when storage is not configured', async () => {
    process.env.AWS_BUCKET = ''

    await expect(getTermsFileStream(TERMS_DOCUMENTS.guests)).resolves.toBeNull()
    expect(mocks.send).not.toHaveBeenCalled()
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

describe('terms route paths', () => {
  it('names the documents the way the documents name themselves', () => {
    expect(TERMS_PATHS.organizers).toBe('/terminos-y-condiciones/organizadores')
    expect(TERMS_PATHS.guests).toBe('/terminos-y-condiciones/invitados')
  })
})

describe('terms pdf path', () => {
  it('keeps the document behind our own origin', () => {
    expect(getTermsPdfPath(TERMS_DOCUMENTS.guests)).toBe(
      '/terminos-y-condiciones/invitados/pdf'
    )
    expect(getTermsPdfPath(TERMS_DOCUMENTS.organizers)).not.toContain(
      'amazonaws'
    )
  })
})
