import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  wishlistGiftFindUnique: vi.fn(),
  wishlistGiftFindFirst: vi.fn(),
  wishlistGiftCreate: vi.fn(),
  wishlistGiftUpdateMany: vi.fn(),
  recomputeWishlistGiftProgress: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.$transaction,
    gift: {
      update: mocks.giftUpdate,
      create: mocks.giftCreate,
    },
    wishlistGift: {
      findUnique: mocks.wishlistGiftFindUnique,
      findFirst: mocks.wishlistGiftFindFirst,
      create: mocks.wishlistGiftCreate,
      updateMany: mocks.wishlistGiftUpdateMany,
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/actions/data/transaction', () => ({
  recomputeWishlistGiftProgress: mocks.recomputeWishlistGiftProgress,
}))

import { createGift, editGift } from '@/actions/data/gift'
import {
  createGiftWithWishlistGift,
  editGiftWithWishlistGift,
} from '@/actions/data/wishlist-gift'

const baseFormData = {
  name: 'Silla',
  categoryId: 'cat1',
  price: '150000',
  imageUrl: '',
  isDefault: false,
  eventId: 'e1',
  wishlistId: 'w1',
  isFavoriteGift: false,
  isGroupGift: false,
  quantity: 1,
}

const PRICE_LOCKED_ERROR =
  'No se puede cambiar el precio de un regalo que ya tiene contribuciones o pagos.'

describe('organizer creates and edits gifts', () => {
  beforeEach(() => {
    mocks.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          gift: { update: mocks.giftUpdate },
          wishlistGift: {
            findUnique: mocks.wishlistGiftFindUnique,
            findFirst: mocks.wishlistGiftFindFirst,
            create: mocks.wishlistGiftCreate,
            updateMany: mocks.wishlistGiftUpdateMany,
          },
        })
    )
  })

  it('allows any edit when the price is not changing', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '150000' },
      isGroupGift: false,
      reservedQuantity: 1,
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
  })

  it('blocks a price change on an individual gift with an active claim', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: false,
      reservedQuantity: 1,
    })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('allows a price change on an individual gift with no claims yet', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: false,
      reservedQuantity: 0,
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
  })

  it('blocks a price change on a group gift with a completed contribution', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: true,
      reservedQuantity: 0, // group gifts never touch reservedQuantity
      isFullyPaid: false,
      transactions: [{ id: 'tx1' }],
    })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('blocks a price change when persisted group contributions are present', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: true,
      isFullyPaid: false,
      groupGiftParts: '25000',
      reservedQuantity: 0,
      transactions: [],
    })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })
})

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
      image: null,
    },
    transactions: [],
  }
}

describe('organizer wishlist gift price and copy policy', () => {
  let transactionCompleted: boolean

  beforeEach(() => {
    transactionCompleted = false
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftUpdate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.wishlistGiftFindFirst.mockResolvedValue(null)
    mocks.wishlistGiftCreate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })
    mocks.$transaction.mockImplementation(async callback => {
      const result = await callback({
        gift: {
          create: mocks.giftCreate,
          update: mocks.giftUpdate,
        },
        wishlistGift: {
          findFirst: mocks.wishlistGiftFindFirst,
          create: mocks.wishlistGiftCreate,
          updateMany: mocks.wishlistGiftUpdateMany,
          findUnique: mocks.wishlistGiftFindUnique,
        },
      })
      transactionCompleted = true
      return result
    })
  })

  it('creates a gift and its wishlist entry in one transaction', async () => {
    const result = await createGiftWithWishlistGift({
      gift: { ...giftValues, isDefault: false, eventId: 'event-1' },
      wishlistGift: {
        wishlistId: 'wishlist-1',
        eventId: 'event-1',
        isFavoriteGift: false,
        isGroupGift: false,
        quantity: 1,
      },
    })

    expect(mocks.$transaction).toHaveBeenCalledOnce()
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
      gift: { ...giftValues, isDefault: false, eventId: 'event-1' },
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
      data: expect.objectContaining({ isDefault: false, eventId: 'event-1' }),
    })
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: { id: 'wishlist-gift-1', reservedQuantity: { lte: 1 } },
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
      gift: { ...giftValues, name: 'Silla original' },
      wishlistGift: { ...wishlistGiftValues, isFavoriteGift: true },
    })

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: { id: 'wishlist-gift-1', reservedQuantity: { lte: 1 } },
      data: expect.objectContaining({
        giftId: 'default-gift-1',
        isFavoriteGift: true,
      }),
    })
    expect(result).toEqual({ giftId: 'default-gift-1' })
  })

  it('blocks a price change on a reserved individual gift before copying', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(true),
      reservedQuantity: 1,
      gift: { ...currentWishlistGift(true).gift, price: '100000' },
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(transactionCompleted).toBe(false)
    expect(result).toHaveProperty('error')
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

describe('organizer creates customized gift copies', () => {
  beforeEach(() => {
    mocks.giftCreate.mockResolvedValue({ id: 'g2' })
  })

  it('skips the lock entirely for a genuinely new registry entry (no wishlistGiftId)', async () => {
    const result = await createGift({
      ...baseFormData,
      isDefault: false,
      eventId: 'e1',
    })

    expect(result).toEqual({ giftId: 'g2' })
    expect(mocks.wishlistGiftFindUnique).not.toHaveBeenCalled()
  })

  it('blocks creating a customized copy with a new price while claimed', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: false,
      reservedQuantity: 2,
    })

    const result = await createGift(
      {
        ...baseFormData,
        isDefault: false,
        eventId: 'e1',
      },
      'wg1'
    )

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('allows creating a customized copy with the same price regardless of claims', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '150000' },
      isGroupGift: false,
      reservedQuantity: 2,
    })

    const result = await createGift(
      {
        ...baseFormData,
        isDefault: false,
        eventId: 'e1',
      },
      'wg1'
    )

    expect(result).toEqual({ giftId: 'g2' })
    expect(mocks.wishlistGiftFindUnique).toHaveBeenCalledOnce()
  })
})
