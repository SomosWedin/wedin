import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventFindFirst: vi.fn(),
  imageCreate: vi.fn(),
  imageFindMany: vi.fn(),
  imageDeleteMany: vi.fn(),
  deleteStoredImageObject: vi.fn(),
  getOwnedStorageKey: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    event: { findFirst: mocks.eventFindFirst },
    image: {
      create: mocks.imageCreate,
      findMany: mocks.imageFindMany,
      deleteMany: mocks.imageDeleteMany,
    },
  },
}))

vi.mock('@/lib/server/image-storage', () => ({
  deleteStoredImageObject: mocks.deleteStoredImageObject,
  getOwnedStorageKey: mocks.getOwnedStorageKey,
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { addImages, deleteImages } from '@/actions/data/images'

describe('event image management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.eventFindFirst.mockResolvedValue({ id: 'event-1' })
    mocks.imageCreate.mockResolvedValue({ id: 'image-1', url: 'url' })
    mocks.imageFindMany.mockResolvedValue([
      {
        id: 'image-1',
        url: 'https://bucket.example/image-1.jpg',
      },
    ])
    mocks.deleteStoredImageObject.mockResolvedValue(undefined)
    mocks.getOwnedStorageKey.mockReturnValue('uploads/user/image.jpg')
    mocks.imageDeleteMany.mockResolvedValue({ count: 1 })
  })

  it('does not add images to an event owned by someone else', async () => {
    mocks.eventFindFirst.mockResolvedValue(null)

    const result = await addImages({
      eventId: 'event-2',
      imageUrls: ['https://bucket.example/image.jpg'],
    })

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.imageCreate).not.toHaveBeenCalled()
  })

  it('does not save a URL outside the configured image bucket', async () => {
    mocks.getOwnedStorageKey.mockImplementation(() => {
      throw new Error('Invalid stored image URL.')
    })

    const result = await addImages({
      eventId: 'event-1',
      imageUrls: ['https://example.com/image.jpg'],
    })

    expect(result).toEqual({ error: 'Error uploading event images' })
    expect(mocks.imageCreate).not.toHaveBeenCalled()
  })

  it('rejects a mixed set instead of deleting only the owned images', async () => {
    const result = await deleteImages({
      imageIds: ['image-1', 'foreign-image'],
    })

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.deleteStoredImageObject).not.toHaveBeenCalled()
    expect(mocks.imageDeleteMany).not.toHaveBeenCalled()
  })

  it('keeps the database row when storage deletion fails', async () => {
    mocks.deleteStoredImageObject.mockRejectedValue(new Error('S3 failed'))

    const result = await deleteImages({ imageIds: ['image-1'] })

    expect(result).toEqual({ error: 'Error deleting event images' })
    expect(mocks.imageDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes an owned object before deleting its database row', async () => {
    const result = await deleteImages({ imageIds: ['image-1'] })

    expect(mocks.deleteStoredImageObject).toHaveBeenCalledWith(
      'https://bucket.example/image-1.jpg'
    )
    expect(mocks.imageDeleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['image-1'] },
        Event: { users: { some: { id: 'user-1' } } },
      },
    })
    expect(
      mocks.deleteStoredImageObject.mock.invocationCallOrder[0]
    ).toBeLessThan(mocks.imageDeleteMany.mock.invocationCallOrder[0])
    expect(result).toEqual({ success: true })
  })
})
