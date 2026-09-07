import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  giftStart: vi.fn(),
  giftUpload: vi.fn(),
  giftReview: vi.fn(),
  giftReviewRows: vi.fn(),
  giftAccept: vi.fn(),
  collectionStart: vi.fn(),
  collectionUpload: vi.fn(),
  collectionReview: vi.fn(),
  collectionReviewRows: vi.fn(),
  collectionAccept: vi.fn(),
}))

vi.mock('@/actions/data/import-job', () => ({
  startAdminImportJob: mocks.giftStart,
  uploadAdminImportRows: mocks.giftUpload,
  reviewAdminImportJob: mocks.giftReview,
  getAdminImportReviewRows: mocks.giftReviewRows,
  acceptAdminGiftImport: mocks.giftAccept,
}))
vi.mock('@/actions/data/collection-import', () => ({
  startAdminCollectionImportJob: mocks.collectionStart,
  uploadAdminCollectionImportRows: mocks.collectionUpload,
  reviewAdminCollectionImportJob: mocks.collectionReview,
  getAdminCollectionImportReviewRows: mocks.collectionReviewRows,
  acceptAdminCollectionImport: mocks.collectionAccept,
}))

import { POST } from '@/app/api/admin/import-jobs/draft/[kind]/route'

const base = 'https://app.example.test/api/admin/import-jobs/draft/'
function request(
  kind: string,
  operation: string,
  input: unknown,
  origin = true
) {
  return POST(
    new Request(base + kind, {
      method: 'POST',
      headers: origin ? { origin: 'https://app.example.test' } : {},
      body: JSON.stringify({ operation, input }),
    }),
    { params: { kind } }
  )
}

describe('admin import draft HTTP boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    for (const mock of Object.values(mocks))
      mock.mockResolvedValue({ ok: true })
  })

  it('routes every gift draft operation without Server Action transport', async () => {
    const operations = [
      ['start', mocks.giftStart],
      ['upload', mocks.giftUpload],
      ['review', mocks.giftReview],
      ['reviewRows', mocks.giftReviewRows],
      ['accept', mocks.giftAccept],
    ] as const
    for (const [operation, mock] of operations) {
      const input = { operation }
      expect((await request('gift', operation, input)).status).toBe(200)
      expect(mock).toHaveBeenCalledWith(input)
    }
  })

  it('routes every collection draft operation without Server Action transport', async () => {
    const operations = [
      ['start', mocks.collectionStart],
      ['upload', mocks.collectionUpload],
      ['review', mocks.collectionReview],
      ['reviewRows', mocks.collectionReviewRows],
      ['accept', mocks.collectionAccept],
    ] as const
    for (const [operation, mock] of operations) {
      const input = { operation }
      expect((await request('collection', operation, input)).status).toBe(200)
      expect(mock).toHaveBeenCalledWith(input)
    }
  })

  it('rejects cross-origin and unknown operations', async () => {
    expect((await request('gift', 'start', {}, false)).status).toBe(403)
    expect((await request('gift', 'unknown', {})).status).toBe(400)
    expect((await request('unknown', 'start', {})).status).toBe(400)
    expect(Object.values(mocks).every(mock => !mock.mock.calls.length)).toBe(
      true
    )
  })
})
