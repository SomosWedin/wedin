import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@aws-sdk/client-s3', () => ({
  HeadObjectCommand: class {
    constructor(public input: unknown) {}
  },
  S3Client: class {
    send = mocks.send
  },
}))

import {
  getTermsFileUrl,
  getTermsFileVersion,
} from '@/lib/server/terms-storage'
import { findTermsDocumentBySlug, TERMS_DOCUMENTS } from '@/lib/terms'

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

describe('terms file version', () => {
  beforeEach(() => {
    process.env.AWS_BUCKET = 'somos-wedin'
    process.env.AWS_BUCKET_REGION = 'us-east-2'
  })

  it('fingerprints the document with its unquoted ETag', async () => {
    mocks.send.mockResolvedValue({
      ETag: '"4e3503bcbe13b17335ab73d6803a0193"',
    })

    await expect(getTermsFileVersion(TERMS_DOCUMENTS.guests)).resolves.toBe(
      '4e3503bcbe13b17335ab73d6803a0193'
    )
  })

  it('degrades to no version instead of throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.send.mockRejectedValue(new Error('NoSuchKey'))

    await expect(
      getTermsFileVersion(TERMS_DOCUMENTS.guests)
    ).resolves.toBeNull()
  })
})
