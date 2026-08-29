import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  giftCreate: vi.fn(),
  giftUpdate: vi.fn(),
  giftFindMany: vi.fn(),
  categoryFindUnique: vi.fn(),
  eventFindFirst: vi.fn(),
  wishlistGiftFindFirst: vi.fn(),
  wishlistGiftCreate: vi.fn(),
  wishlistGiftUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.transaction,
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/actions/data/transaction', () => ({
  recomputeWishlistGiftProgress: vi.fn(),
}))

import {
  createGiftWithWishlistGift,
  editGiftWithWishlistGift,
} from '@/actions/data/wishlist-gift'

const giftValues = {
  name: 'Silla personalizada',
  categoryId: 'category-1',
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
    isGroupGift: false,
    reservedQuantity: 0,
    gift: {
      id: isDefault ? 'default-gift-1' : 'private-gift-1',
      name: 'Silla original',
      categoryId: 'category-1',
      price: '150000',
      isDefault,
      eventId: 'event-1',
      image: null,
      wishlistGifts: [],
    },
    transactions: [],
  }
}

describe('atomic gift and wishlist gift mutations', () => {
  let transactionCompleted: boolean

  beforeEach(() => {
    transactionCompleted = false
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftUpdate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftFindMany.mockImplementation(({ where }) =>
      where.id?.in
        ? [{ id: 'private-gift-1', isDefault: false, eventId: 'event-1' }]
        : []
    )
    mocks.categoryFindUnique.mockResolvedValue({ id: 'category-1' })
    mocks.eventFindFirst.mockResolvedValue({ id: 'event-1' })
    mocks.wishlistGiftFindFirst.mockResolvedValue(null)
    mocks.wishlistGiftCreate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(async callback => {
      const result = await callback({
        gift: {
          create: mocks.giftCreate,
          update: mocks.giftUpdate,
          findMany: mocks.giftFindMany,
        },
        category: { findUnique: mocks.categoryFindUnique },
        event: { findFirst: mocks.eventFindFirst },
        wishlistGift: {
          findFirst: mocks.wishlistGiftFindFirst,
          create: mocks.wishlistGiftCreate,
          updateMany: mocks.wishlistGiftUpdateMany,
        },
      })
      transactionCompleted = true
      return result
    })
  })

  it('creates a gift and its wishlist entry in one transaction', async () => {
    const result = await createGiftWithWishlistGift({
      gift: {
        ...giftValues,
        isDefault: false,
        eventId: 'event-1',
      },
      wishlistGift: {
        wishlistId: 'wishlist-1',
        eventId: 'event-1',
        isFavoriteGift: false,
        isGroupGift: false,
        quantity: 1,
      },
    })

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.wishlistGiftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ giftId: 'private-gift-1' }),
    })
    expect(transactionCompleted).toBe(true)
    expect(result).toEqual({
      giftId: 'private-gift-1',
      wishlistGiftId: 'wishlist-gift-1',
    })
  })

  it('does not complete the transaction when wishlist creation fails', async () => {
    mocks.wishlistGiftCreate.mockRejectedValue(new Error('link failed'))

    const result = await createGiftWithWishlistGift({
      gift: {
        ...giftValues,
        isDefault: false,
        eventId: 'event-1',
      },
      wishlistGift: {
        wishlistId: 'wishlist-1',
        eventId: 'event-1',
        isFavoriteGift: false,
        isGroupGift: false,
        quantity: 1,
      },
    })

    expect(mocks.giftCreate).toHaveBeenCalledOnce()
    expect(transactionCompleted).toBe(false)
    expect(result).toEqual({ error: 'link failed' })
  })

  it('copies a default gift and relinks the wishlist entry atomically', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(true))

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isDefault: false,
        event: { connect: { id: 'event-1' } },
      }),
    })
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 1 },
      },
      data: expect.objectContaining({ giftId: 'private-gift-1' }),
    })
    expect(transactionCompleted).toBe(true)
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('rolls back the default-gift copy when relinking is rejected', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(true))
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).toHaveBeenCalledOnce()
    expect(transactionCompleted).toBe(false)
    expect(result).toEqual({
      error:
        'La cantidad no puede ser menor a las unidades ya reservadas o vendidas.',
    })
  })

  it('does not copy a default gift when only wishlist settings change', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(true))

    const result = await editGiftWithWishlistGift({
      gift: {
        ...giftValues,
        name: 'Silla original',
      },
      wishlistGift: {
        ...wishlistGiftValues,
        isFavoriteGift: true,
      },
    })

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 1 },
      },
      data: expect.objectContaining({
        giftId: 'default-gift-1',
        isFavoriteGift: true,
      }),
    })
    expect(result).toEqual({ giftId: 'default-gift-1' })
  })

  it('rolls back before copying when a reserved individual gift changes price', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(true),
      reservedQuantity: 1,
      gift: {
        ...currentWishlistGift(true).gift,
        price: '100000',
      },
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(transactionCompleted).toBe(false)
    expect(result).toEqual({
      error:
        'No se puede cambiar el precio de un regalo que ya tiene contribuciones o pagos.',
    })
  })

  it('updates an existing private gift instead of creating another copy', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'private-gift-1' },
      data: expect.objectContaining({ name: 'Silla personalizada' }),
    })
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })
})
