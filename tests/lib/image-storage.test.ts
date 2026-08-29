import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getOwnedStorageKey } from '@/lib/server/image-storage'

describe('stored image URL validation', () => {
  beforeEach(() => {
    process.env.AWS_BUCKET = 'wedin-images'
    process.env.AWS_BUCKET_REGION = 'us-east-1'
  })

  it('extracts a key only from the configured bucket host', () => {
    expect(
      getOwnedStorageKey(
        'https://wedin-images.s3.us-east-1.amazonaws.com/uploads/user/a%20b.jpg'
      )
    ).toBe('uploads/user/a b.jpg')
  })

  it('rejects an external URL instead of treating its path as an S3 key', () => {
    expect(() =>
      getOwnedStorageKey('https://example.com/uploads/user/image.jpg')
    ).toThrow('Invalid stored image URL.')
  })
})
