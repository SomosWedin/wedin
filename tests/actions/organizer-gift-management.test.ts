import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  eventFindFirst: vi.fn(),
  categoryFindUnique: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  giftFindFirst: vi.fn(),
  giftFindMany: vi.fn(),
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
    event: { findFirst: mocks.eventFindFirst },
    category: { findUnique: mocks.categoryFindUnique },
    gift: {
      update: mocks.giftUpdate,
      create: mocks.giftCreate,
      findFirst: mocks.giftFindFirst,
      findMany: mocks.giftFindMany,
    },
    wishlistGift: {
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

import {
  createGiftWithWishlistGift,
  editGiftWithWishlistGift,
} from '@/actions/data/wishlist-gift'

const RESERVATION_LOCK_ERROR =
  'Este regalo está reservado en un checkout. Podrás editarlo si la reserva vence o el pago falla.'
const RECEIVED_LOCK_ERROR =
  'Este regalo ya recibió contribuciones o pagos y no se puede editar.'
const MANUAL_LOCK_ERROR =
  'Marcaste este regalo como recibido. Desmarcalo para poder editarlo.'

const unlockedWishlistGiftWhere = {
  id: 'wishlist-gift-1',
  isFullyPaid: false,
  isManuallyReceived: false,
  groupGiftParts: '0',
  reservedQuantity: 0,
  reservedAmount: 0,
}

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
    isManuallyReceived: false,
    groupGiftParts: '0',
    reservedQuantity: 0,
    reservedAmount: 0,
    event: { eventTypeId: 'event-type-wedding' },
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

describe('organizer wishlist gift price and copy policy', () => {
  let transactionCompleted: boolean

  beforeEach(() => {
    transactionCompleted = false
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftUpdate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.eventFindFirst.mockResolvedValue({
      id: 'event-1',
      eventTypeId: 'event-type-wedding',
    })
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      eventTypeIds: ['event-type-wedding'],
    })
    mocks.giftFindFirst.mockResolvedValue(null)
    mocks.giftFindMany.mockImplementation(({ where }) =>
      where.name
        ? []
        : [
            {
              id: 'private-gift-1',
              isDefault: false,
              eventId: 'event-1',
              category: { eventTypeIds: ['event-type-wedding'] },
            },
          ]
    )
    mocks.wishlistGiftFindFirst.mockResolvedValue(null)
    mocks.wishlistGiftCreate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })
    mocks.$transaction.mockImplementation(async callback => {
      const result = await callback({
        event: { findFirst: mocks.eventFindFirst },
        category: { findUnique: mocks.categoryFindUnique },
        gift: {
          create: mocks.giftCreate,
          update: mocks.giftUpdate,
          findFirst: mocks.giftFindFirst,
          findMany: mocks.giftFindMany,
        },
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

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.wishlistGiftFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: {
            wishlistId: 'wishlist-1',
            users: { some: { id: 'user-1' } },
          },
        }),
      })
    )
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
  })

  it('allows raising an individual gift quantity', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, quantity: 5 },
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: unlockedWishlistGiftWhere,
      data: expect.objectContaining({
        giftId: 'private-gift-1',
        isGroupGift: false,
        quantity: 5,
      }),
    })
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('rejects changing quantity while units are reserved', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      quantity: 5,
      reservedQuantity: 3,
    })
    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, quantity: 2 },
    })

    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({ error: RESERVATION_LOCK_ERROR })
  })

  it('rejects quantity changes even when equal to reserved units', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      quantity: 5,
      reservedQuantity: 3,
    })

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, quantity: 3 },
    })

    expect(result).toEqual({ error: RESERVATION_LOCK_ERROR })
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
  })

  it('blocks switching an individual gift to group while it has activity', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: { ...wishlistGiftValues, isGroupGift: true },
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: unlockedWishlistGiftWhere,
      data: expect.objectContaining({ isGroupGift: true, quantity: 1 }),
    })
    expect(result).toEqual({ error: RESERVATION_LOCK_ERROR })
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
      where: unlockedWishlistGiftWhere,
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
    const result = await editGiftWithWishlistGift({
      gift: unchangedGiftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({ error: RECEIVED_LOCK_ERROR })
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

  it('rejects creating a private gift with a nonexistent category', async () => {
    mocks.categoryFindUnique.mockResolvedValue(null)

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

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftCreate).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'La categoría seleccionada no existe.',
    })
  })

  it('rejects a duplicate private gift name in the same event and category', async () => {
    mocks.giftFindMany.mockImplementation(({ where }) =>
      where.name
        ? [{ id: 'private-gift-existing' }]
        : [{ id: 'private-gift-1', isDefault: false, eventId: 'event-1' }]
    )

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

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftCreate).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'Ya existe un regalo con ese nombre en esta categoría.',
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
      data: expect.objectContaining({
        isDefault: false,
        event: { connect: { id: 'event-1' } },
      }),
    })
    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: unlockedWishlistGiftWhere,
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
      error: RESERVATION_LOCK_ERROR,
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
      where: unlockedWishlistGiftWhere,
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
    expect(result).toEqual({ error: RESERVATION_LOCK_ERROR })
  })

  it('blocks metadata edits when the price is unchanged after a reservation', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      reservedQuantity: 1,
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ error: RESERVATION_LOCK_ERROR })
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
      where: unlockedWishlistGiftWhere,
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

    expect(result).toEqual({ error: RECEIVED_LOCK_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('blocks a group gift price change while a contribution is reserved', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      isGroupGift: true,
      reservedAmount: 25000,
      gift: { ...currentWishlistGift(false).gift, price: '100000' },
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: { ...wishlistGiftValues, isGroupGift: true },
    })

    expect(result).toEqual({ error: RESERVATION_LOCK_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('rejects a price write if checkout reserves the gift concurrently', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      gift: { ...currentWishlistGift(false).gift, price: '100000' },
    })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
      where: unlockedWishlistGiftWhere,
      data: expect.any(Object),
    })
    expect(transactionCompleted).toBe(false)
    expect(result).toEqual({ error: RESERVATION_LOCK_ERROR })
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

    expect(result).toEqual({ error: RECEIVED_LOCK_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('blocks every edit after a completed purchase', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      transactions: [{ amount: '150000', quantity: 1 }],
    })

    const result = await editGiftWithWishlistGift({
      gift: { ...giftValues, imageUrl: 'https://cdn.example.com/new.jpg' },
      wishlistGift: { ...wishlistGiftValues, isFavoriteGift: true },
    })

    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({ error: RECEIVED_LOCK_ERROR })
  })

  it('blocks every edit while manually marked as received', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue({
      ...currentWishlistGift(false),
      isManuallyReceived: true,
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({ error: MANUAL_LOCK_ERROR })
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

  it('rejects moving a private gift to a nonexistent category', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))
    mocks.categoryFindUnique.mockResolvedValue(null)

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'La categoría seleccionada no existe.',
    })
  })

  it('rejects renaming a private gift to a duplicate in its category', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))
    mocks.giftFindMany.mockResolvedValue([{ id: 'private-gift-existing' }])

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'Ya existe un regalo con ese nombre en esta categoría.',
    })
  })
})
