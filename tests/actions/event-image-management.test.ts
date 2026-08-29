import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventFindFirst: vi.fn(),
  imageCreate: vi.fn(),
  imageFindMany: vi.fn(),
  imageDeleteMany: vi.fn(),
  deleteStoredImageObjects: vi.fn(),
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
  deleteStoredImageObjects: mocks.deleteStoredImageObjects,
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
        eventId: 'event-1',
      },
    ])
    mocks.deleteStoredImageObjects.mockResolvedValue(undefined)
    mocks.getOwnedStorageKey.mockReturnValue('uploads/user-1/image.jpg')
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

  it('validates new image URLs against the current user and owned event', async () => {
    const imageUrl = 'https://bucket.example/uploads/user-1/image.jpg'

    const result = await addImages({
      eventId: 'event-1',
      imageUrls: [imageUrl],
    })

    expect(mocks.getOwnedStorageKey).toHaveBeenCalledWith(imageUrl, {
      userId: 'user-1',
      eventId: 'event-1',
    })
    expect(mocks.imageCreate).toHaveBeenCalledWith({
      data: { eventId: 'event-1', url: imageUrl },
    })
    expect(result).toEqual({
      success: true,
      images: [{ id: 'image-1', url: 'url' }],
    })
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
    expect(mocks.deleteStoredImageObjects).not.toHaveBeenCalled()
    expect(mocks.imageDeleteMany).not.toHaveBeenCalled()
  })

  it('keeps the database row when storage deletion fails', async () => {
    mocks.deleteStoredImageObjects.mockRejectedValue(new Error('S3 failed'))

    const result = await deleteImages({ imageIds: ['image-1'] })

    expect(result).toEqual({ error: 'Error deleting event images' })
    expect(mocks.imageDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes an owned object before deleting its database row', async () => {
    const result = await deleteImages({ imageIds: ['image-1'] })

    expect(mocks.deleteStoredImageObjects).toHaveBeenCalledWith([
      {
        imageUrl: 'https://bucket.example/image-1.jpg',
        userId: 'user-1',
        eventId: 'event-1',
      },
    ])
    expect(mocks.imageDeleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['image-1'] },
        Event: { users: { some: { id: 'user-1' } } },
      },
    })
    expect(
      mocks.deleteStoredImageObjects.mock.invocationCallOrder[0]
    ).toBeLessThan(mocks.imageDeleteMany.mock.invocationCallOrder[0])
    expect(result).toEqual({ success: true })
  })
})
