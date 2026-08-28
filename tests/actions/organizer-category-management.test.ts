import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  giftCreate: vi.fn(),
  giftUpdate: vi.fn(),
  wishlistGiftFindFirst: vi.fn(),
  wishlistGiftUpdateMany: vi.fn(),
  recomputeWishlistGiftProgress: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.transaction,
    gift: {
      create: mocks.giftCreate,
      update: mocks.giftUpdate,
    },
    wishlistGift: {
      findFirst: mocks.wishlistGiftFindFirst,
      updateMany: mocks.wishlistGiftUpdateMany,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock('@/actions/data/transaction', () => ({
  recomputeWishlistGiftProgress: mocks.recomputeWishlistGiftProgress,
}))

import { editGiftWithWishlistGift } from '@/actions/data/wishlist-gift'

const giftValues = {
  name: 'Silla original',
  categoryId: 'category-2',
  price: '150000',
  imageUrl: '',
}

const wishlistGiftValues = {
  wishlistGiftId: 'wishlist-gift-1',
  wishlistId: 'wishlist-1',
  isFavoriteGift: false,
  isGroupGift: false,
  quantity: 1,
}

function currentWishlistGift(isDefault: boolean) {
  return {
    eventId: 'event-1',
    giftId: isDefault ? 'default-gift-1' : 'private-gift-1',
    isFavoriteGift: false,
    isGroupGift: false,
    quantity: 1,
    isFullyPaid: false,
    groupGiftParts: '0',
    reservedQuantity: 0,
    gift: {
      id: isDefault ? 'default-gift-1' : 'private-gift-1',
      name: 'Silla original',
      categoryId: 'category-1',
      price: '150000',
      isDefault,
      eventId: isDefault ? null : 'event-1',
      image: null,
      wishlistGifts: [{ id: 'wishlist-gift-1' }],
    },
    transactions: [],
  }
}

function expectFinancialProgressUntouched() {
  const update = mocks.wishlistGiftUpdateMany.mock.calls[0][0]
  expect(update.data).not.toHaveProperty('groupGiftParts')
  expect(update.data).not.toHaveProperty('isFullyPaid')
}

describe('organizer category management', () => {
  beforeEach(() => {
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftUpdate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(async callback =>
      callback({
        gift: {
          create: mocks.giftCreate,
          update: mocks.giftUpdate,
        },
        wishlistGift: {
          findFirst: mocks.wishlistGiftFindFirst,
          updateMany: mocks.wishlistGiftUpdateMany,
        },
      })
    )
  })

  it('copies a catalog gift when changing its category after individual activity', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(true),
      reservedQuantity: 1,
      isFullyPaid: true,
      transactions: [{ amount: '150000', quantity: 1 }],
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isDefault: false,
        categoryId: 'category-2',
        eventId: 'event-1',
      }),
    })
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: { id: 'wishlist-gift-1', reservedQuantity: { lte: 1 } },
      data: expect.objectContaining({ giftId: 'private-gift-1' }),
    })
    expectFinancialProgressUntouched()
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('allows a category change after group contributions without recalculating progress', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(true),
      isGroupGift: true,
      groupGiftParts: '50000',
      transactions: [{ amount: '50000', quantity: 1 }],
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: { ...wishlistGiftValues, isGroupGift: true },
    })

    expect(mocks.giftCreate).toHaveBeenCalledOnce()
    expectFinancialProgressUntouched()
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('updates an existing private gift in place when only its category changes', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'private-gift-1' },
      data: expect.objectContaining({ categoryId: 'category-2' }),
    })
    expectFinancialProgressUntouched()
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('isolates the current wishlist before editing a legacy shared private gift', async () => {
    mocks.giftCreate.mockResolvedValueOnce({ id: 'isolated-gift-1' })
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      gift: {
        ...currentWishlistGift(false).gift,
        wishlistGifts: [{ id: 'wishlist-gift-1' }, { id: 'wishlist-gift-2' }],
      },
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).toHaveBeenCalledOnce()
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: { id: 'wishlist-gift-1', reservedQuantity: { lte: 1 } },
      data: expect.objectContaining({ giftId: 'isolated-gift-1' }),
    })
    expect(result).toEqual({ giftId: 'isolated-gift-1' })
  })
})
