import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    wishlistGift: {
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

// actions/data/wishlist-gift.ts imports this at module load time regardless
// of which export is used — left unmocked, it drags in next-auth's real
// module chain (next/server), which vitest's node environment can't resolve.
vi.mock('@/actions/data/transaction', () => ({
  recomputeWishlistGiftProgress: vi.fn(),
}))

import { createWishlistGift } from '@/actions/data/wishlist-gift'

const baseInput = {
  wishlistId: 'w1',
  eventId: 'e1',
  giftId: 'g1',
  isFavoriteGift: false,
}

describe('createWishlistGift quantity normalization', () => {
  beforeEach(() => {
    mocks.findFirst.mockResolvedValue(null)
    mocks.create.mockResolvedValue({ id: 'wg1' })
  })

  it('forces quantity to 1 for a group gift even if a higher value was submitted', async () => {
    await createWishlistGift({ ...baseInput, isGroupGift: true, quantity: 8 })

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        wishlistId: 'w1',
        giftId: 'g1',
        eventId: 'e1',
        isFavoriteGift: false,
        isGroupGift: true,
        quantity: 1,
      },
    })
  })

  it('keeps the submitted quantity for an individual gift', async () => {
    await createWishlistGift({ ...baseInput, isGroupGift: false, quantity: 8 })

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 8 }) })
    )
  })

  it('rejects adding a gift already on the wishlist before touching quantity logic', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'existing' })

    const result = await createWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toEqual({ error: 'Este regalo ya está en tu lista' })
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
