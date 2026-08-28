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

import { createGift } from '@/actions/data/gift'
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

const giftValues = {
  name: 'Silla personalizada',
  categoryId: 'category-1',
  price: '150000',
  imageUrl: '',
}
const unchangedGiftValues = { ...giftValues, name: 'Silla original' }

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

  it('rejects invalid combined edit input before reading the wishlist gift', async () => {
    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, wishlistGiftId: '' },
    })

    expect(result).toHaveProperty('error')
    expect(mocks.wishlistGiftFindFirst).not.toHaveBeenCalled()
  })

  it('errors when the wishlist gift does not exist', async () => {
    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(result).toEqual({ error: 'Regalo no encontrado.' })
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
  })

  it('allows raising an individual gift quantity', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, quantity: 5 },
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 5 },
      },
      data: expect.objectContaining({
        giftId: 'private-gift-1',
        isGroupGift: false,
        quantity: 5,
      }),
    })
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('rejects lowering quantity below reserved or sold units', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      quantity: 5,
      reservedQuantity: 3,
    })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, quantity: 2 },
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 2 },
      },
      data: expect.objectContaining({ quantity: 2 }),
    })
    expect(result).toEqual({
      error:
        'La cantidad no puede ser menor a las unidades ya reservadas o vendidas.',
    })
  })

  it('allows quantity equal to the number of reserved units', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      quantity: 5,
      reservedQuantity: 3,
    })

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, quantity: 3 },
    })

    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('blocks switching an individual gift to group while it has activity', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, isGroupGift: true },
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 0 },
        reservedAmount: 0,
      },
      data: expect.objectContaining({ isGroupGift: true, quantity: 1 }),
    })
    expect(result).toEqual({
      error: 'No se puede cambiar el tipo de un regalo con contribuciones.',
    })
  })

  it('allows switching an individual gift to group without activity', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: {
        ...wishlistGiftValues,
        isGroupGift: true,
        quantity: 7,
      },
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 0 },
        reservedAmount: 0,
      },
      data: expect.objectContaining({ isGroupGift: true, quantity: 1 }),
    })
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('blocks switching a group gift to individual while it has contributions', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      isGroupGift: true,
      groupGiftParts: '25000',
    })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 1 },
        reservedAmount: 0,
      },
      data: expect.objectContaining({ isGroupGift: false }),
    })
    expect(result).toEqual({
      error: 'No se puede cambiar el tipo de un regalo con contribuciones.',
    })
  })

  it('allows switching a group gift to individual without contributions', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      isGroupGift: true,
    })

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, quantity: 4 },
    })

    expect(result).toEqual({ giftId: 'private-gift-1' })
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
    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
  })

  it('allows metadata edits when the price is unchanged after a reservation', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      reservedQuantity: 1,
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftUpdate).toHaveBeenCalledOnce()
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('allows a price change on an individual gift with no activity', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      gift: { ...currentWishlistGift(false).gift, price: '100000' },
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftUpdate).toHaveBeenCalledOnce()
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'wishlist-gift-1',
        reservedQuantity: { lte: 1 },
      },
      data: expect.objectContaining({ isFullyPaid: false }),
    })
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('blocks a price change on a group gift with a completed contribution', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      isGroupGift: true,
      gift: { ...currentWishlistGift(false).gift, price: '100000' },
      transactions: [{ amount: '25000', quantity: 1 }],
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: { ...wishlistGiftValues, isGroupGift: true },
    })

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('blocks a price change when persisted group contributions are present', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      isGroupGift: true,
      groupGiftParts: '25000',
      gift: { ...currentWishlistGift(false).gift, price: '100000' },
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: { ...wishlistGiftValues, isGroupGift: true },
    })

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
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
