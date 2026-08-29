import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    wishlistGift: {
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  deleteWishlistGift,
  setWishlistGiftManuallyReceived,
} from '@/actions/data/wishlist-gift'

describe('wishlist mutation authorization', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.findFirst.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.deleteMany.mockResolvedValue({ count: 1 })
  })

  it('requires authentication before changing received status', async () => {
    mocks.getCurrentUser.mockResolvedValue(null)

    const result = await setWishlistGiftManuallyReceived({
      wishlistGiftId: 'wishlist-gift-1',
      isManuallyReceived: true,
    })

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it('scopes received-status changes to events owned by the user', async () => {
    await setWishlistGiftManuallyReceived({
      wishlistGiftId: 'wishlist-gift-1',
      isManuallyReceived: true,
    })

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        event: { users: { some: { id: 'user-1' } } },
      },
      data: { isManuallyReceived: true },
    })
  })

  it('does not delete a wishlist gift owned by another event', async () => {
    mocks.findFirst.mockResolvedValue(null)

    const result = await deleteWishlistGift({
      wishlistId: 'wishlist-1',
      giftId: 'gift-1',
    })

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        wishlistId: 'wishlist-1',
        giftId: 'gift-1',
        event: { users: { some: { id: 'user-1' } } },
      },
      select: { id: true },
    })
    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.deleteMany).not.toHaveBeenCalled()
  })
})
