import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  categoryFindUnique: vi.fn(),
  giftCreate: vi.fn(),
  giftFindMany: vi.fn(),
  giftUpdate: vi.fn(),
  wishlistGiftFindFirst: vi.fn(),
  wishlistGiftUpdateMany: vi.fn(),
  recomputeWishlistGiftProgress: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.transaction,
    category: { findUnique: mocks.categoryFindUnique },
    gift: {
      create: mocks.giftCreate,
      findMany: mocks.giftFindMany,
      update: mocks.giftUpdate,
    },
    wishlistGift: {
      findFirst: mocks.wishlistGiftFindFirst,
      updateMany: mocks.wishlistGiftUpdateMany,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

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

const RESERVATION_LOCK_ERROR =
  'Este regalo está reservado en un checkout. Podrás editarlo si la reserva vence o el pago falla.'
const RECEIVED_LOCK_ERROR =
  'Este regalo ya recibió contribuciones o pagos y no se puede editar.'
const unlockedWishlistGiftWhere = {
  id: 'wishlist-gift-1',
  isFullyPaid: false,
  isManuallyReceived: false,
  groupGiftParts: '0',
  reservedQuantity: 0,
  reservedAmount: 0,
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

function expectFinancialProgressUntouched() {
  const update = mocks.wishlistGiftUpdateMany.mock.calls[0][0]
  expect(update.data).not.toHaveProperty('groupGiftParts')
  expect(update.data).not.toHaveProperty('isFullyPaid')
}

describe('organizer category management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-2',
      eventTypeIds: ['event-type-wedding'],
    })
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftUpdate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(async callback =>
      callback({
        category: { findUnique: mocks.categoryFindUnique },
        gift: {
          create: mocks.giftCreate,
          findMany: mocks.giftFindMany,
          update: mocks.giftUpdate,
        },
        wishlistGift: {
          findFirst: mocks.wishlistGiftFindFirst,
          updateMany: mocks.wishlistGiftUpdateMany,
        },
      })
    )
  })

  it('blocks changing a category after individual activity', async () => {
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

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({ error: RECEIVED_LOCK_ERROR })
  })

  it('blocks a category change after group contributions', async () => {
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

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdateMany).not.toHaveBeenCalled()
    expect(result).toEqual({ error: RECEIVED_LOCK_ERROR })
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
      data: expect.objectContaining({
        category: { connect: { id: 'category-2' } },
      }),
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
      where: unlockedWishlistGiftWhere,
      data: expect.objectContaining({ giftId: 'isolated-gift-1' }),
    })
    expect(result).toEqual({ giftId: 'isolated-gift-1' })
  })

  it('edits a gift whose category left the event type when the category is unchanged', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      eventTypeIds: ['event-type-birthday'],
    })

    const result = await editGiftWithWishlistGift({
      gift: { ...giftValues, categoryId: 'category-1' },
      wishlistGift: wishlistGiftValues,
    })

    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('still blocks moving a gift into a category outside the event type', async () => {
    mocks.wishlistGiftFindFirst.mockResolvedValue(currentWishlistGift(false))
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-2',
      eventTypeIds: ['event-type-birthday'],
    })

    const result = await editGiftWithWishlistGift({
      gift: giftValues,
      wishlistGift: wishlistGiftValues,
    })

    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'La categoría no es compatible con el tipo de evento.',
    })
  })

  it('blocks a category change while checkout has a reservation', async () => {
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
})
