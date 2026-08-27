import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  giftCreate: vi.fn(),
  giftFindUnique: vi.fn(),
  wishlistGiftCreate: vi.fn(),
  wishlistGiftFindFirst: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    gift: {
      create: mocks.giftCreate,
      findUnique: mocks.giftFindUnique,
    },
    wishlistGift: {
      create: mocks.wishlistGiftCreate,
      findFirst: mocks.wishlistGiftFindFirst,
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/actions/data/transaction', () => ({
  recomputeWishlistGiftProgress: vi.fn(),
}))

import { createGiftFlow } from '@/hooks/dialog/forms/create-gift-flow'

const values = {
  name: 'Juego de sábanas',
  categoryId: 'category-1',
  price: '150000',
  isDefault: false,
  sourceGiftId: '',
  isEditedVersion: false,
  eventId: 'event-1',
  imageUrl: '',
  wishlistId: 'wishlist-1',
  isFavoriteGift: true,
  isGroupGift: false,
  quantity: 2,
}

describe('createGiftFlow', () => {
  beforeEach(() => {
    mocks.giftCreate.mockResolvedValue({ id: 'gift-1' })
    mocks.wishlistGiftCreate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.wishlistGiftFindFirst.mockResolvedValue(null)
  })

  it('creates a non-default gift and links it to the couple wishlist', async () => {
    const result = await createGiftFlow({
      values,
      imageUrl: 'https://cdn.example.com/gift.jpg',
      isAdminRoute: false,
      eventId: 'event-1',
      wishlistId: 'wishlist-1',
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isDefault: false,
        eventId: 'event-1',
        image: {
          create: { url: 'https://cdn.example.com/gift.jpg' },
        },
      }),
    })
    expect(mocks.wishlistGiftCreate).toHaveBeenCalledWith({
      data: {
        wishlistId: 'wishlist-1',
        eventId: 'event-1',
        giftId: 'gift-1',
        isFavoriteGift: true,
        isGroupGift: false,
        quantity: 2,
      },
    })
    expect(result).toEqual({
      giftId: 'gift-1',
      wishlistGiftId: 'wishlist-gift-1',
    })
  })

  it('creates a default admin gift without linking it to a wishlist', async () => {
    const result = await createGiftFlow({
      values,
      imageUrl: '',
      isAdminRoute: true,
      eventId: undefined,
      wishlistId: undefined,
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isDefault: true,
        eventId: undefined,
      }),
    })

    expect(mocks.wishlistGiftCreate).not.toHaveBeenCalled()
    expect(result).toEqual({ giftId: 'gift-1' })
  })
})
