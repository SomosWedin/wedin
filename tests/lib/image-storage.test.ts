import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@aws-sdk/client-s3', () => ({
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
  S3Client: class {
    send = mocks.send
  },
}))

import {
  deleteStoredImageObjects,
  getOwnedStorageKey,
} from '@/lib/server/image-storage'

const ownership = { userId: 'user-1', eventId: 'event-1' }

describe('stored image URL validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AWS_BUCKET = 'wedin-images'
    process.env.AWS_BUCKET_REGION = 'us-east-1'
    mocks.send.mockResolvedValue({})
  })

  it('accepts a current key scoped to the authenticated user', () => {
    expect(
      getOwnedStorageKey(
        'https://wedin-images.s3.us-east-1.amazonaws.com/uploads/user-1/a%20b.jpg',
        ownership
      )
    ).toBe('uploads/user-1/a b.jpg')
  })

  it('accepts an old key scoped to the owned event', () => {
    expect(
      getOwnedStorageKey(
        'https://wedin-images.s3.us-east-1.amazonaws.com/event-1/old.jpg',
        ownership
      )
    ).toBe('event-1/old.jpg')
  })

  it('rejects an external URL instead of treating its path as an S3 key', () => {
    expect(() =>
      getOwnedStorageKey(
        'https://example.com/uploads/user-1/image.jpg',
        ownership
      )
    ).toThrow('Invalid stored image URL.')
  })

  it.each([
    'http://wedin-images.s3.us-east-1.amazonaws.com/uploads/user-1/image.jpg',
    'https://wedin-images.s3.us-east-1.amazonaws.com/',
  ])('rejects an invalid stored image URL: %s', imageUrl => {
    expect(() => getOwnedStorageKey(imageUrl, ownership)).toThrow(
      'Invalid stored image URL.'
    )
  })

  it.each([
    'https://wedin-images.s3.us-east-1.amazonaws.com/uploads/user-2/image.jpg',
    'https://wedin-images.s3.us-east-1.amazonaws.com/uploads/user-10/image.jpg',
    'https://wedin-images.s3.us-east-1.amazonaws.com/event-2/old.jpg',
  ])('rejects a key outside the user and event prefixes: %s', imageUrl => {
    expect(() => getOwnedStorageKey(imageUrl, ownership)).toThrow(
      'Stored image does not belong to this user or event.'
    )
  })

  it('validates the complete batch before deleting any object', async () => {
    await expect(
      deleteStoredImageObjects([
        {
          imageUrl:
            'https://wedin-images.s3.us-east-1.amazonaws.com/uploads/user-1/owned.jpg',
          ...ownership,
        },
        {
          imageUrl:
            'https://wedin-images.s3.us-east-1.amazonaws.com/uploads/user-2/foreign.jpg',
          ...ownership,
        },
      ])
    ).rejects.toThrow('Stored image does not belong to this user or event.')

    expect(mocks.send).not.toHaveBeenCalled()
  })
})
