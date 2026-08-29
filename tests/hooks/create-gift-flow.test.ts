import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  giftCreate: vi.fn(),
  categoryFindUnique: vi.fn(),
  giftFindUnique: vi.fn(),
  giftFindMany: vi.fn(),
  eventFindFirst: vi.fn(),
  wishlistGiftCreate: vi.fn(),
  wishlistGiftFindFirst: vi.fn(),
  giftlistFindFirst: vi.fn(),
  giftlistFindMany: vi.fn(),
  giftlistCreate: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    category: { findUnique: mocks.categoryFindUnique },
    gift: {
      create: mocks.giftCreate,
      findUnique: mocks.giftFindUnique,
      findMany: mocks.giftFindMany,
    },
    event: { findFirst: mocks.eventFindFirst },
    giftlist: {
      findMany: mocks.giftlistFindMany,
      findFirst: mocks.giftlistFindFirst,
      create: mocks.giftlistCreate,
    },
    wishlistGift: {
      create: mocks.wishlistGiftCreate,
      findFirst: mocks.wishlistGiftFindFirst,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
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
  eventId: 'event-1',
  imageUrl: '',
  wishlistId: 'wishlist-1',
  isFavoriteGift: true,
  isGroupGift: false,
  quantity: 2,
  giftlistIds: [],
}

describe('createGiftFlow', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'ADMIN' })
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      eventTypeIds: ['event-type-wedding'],
    })
    mocks.giftCreate.mockResolvedValue({ id: 'gift-1' })
    mocks.giftFindMany.mockImplementation(({ where }) =>
      where.name
        ? []
        : [
            {
              id: 'gift-1',
              isDefault: false,
              eventId: 'event-1',
              category: { eventTypeIds: ['event-type-wedding'] },
            },
          ]
    )
    mocks.eventFindFirst.mockResolvedValue({
      id: 'event-1',
      eventTypeId: 'event-type-wedding',
    })
    mocks.giftlistCreate.mockResolvedValue({ id: 'giftlist-1' })
    mocks.wishlistGiftCreate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.wishlistGiftFindFirst.mockResolvedValue(null)
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          category: { findUnique: mocks.categoryFindUnique },
          gift: {
            create: mocks.giftCreate,
            findMany: mocks.giftFindMany,
          },
          event: { findFirst: mocks.eventFindFirst },
          giftlist: {
            findMany: mocks.giftlistFindMany,
            findFirst: mocks.giftlistFindFirst,
            create: mocks.giftlistCreate,
          },
          wishlistGift: {
            findFirst: mocks.wishlistGiftFindFirst,
            create: mocks.wishlistGiftCreate,
          },
        })
    )
  })

  it('creates a non-default gift and links it to the couple wishlist', async () => {
    const result = await createGiftFlow({
      mode: 'wishlist',
      values,
      imageUrl: 'https://cdn.example.com/gift.jpg',
      eventId: 'event-1',
      wishlistId: 'wishlist-1',
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isDefault: false,
        event: { connect: { id: 'event-1' } },
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
      mode: 'admin',
      values,
      imageUrl: '',
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isDefault: true,
        category: { connect: { id: 'category-1' } },
      }),
    })

    expect(mocks.wishlistGiftCreate).not.toHaveBeenCalled()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('creates an admin gift in multiple collections in one transaction', async () => {
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'giftlist-1', eventTypeIds: ['event-type-wedding'] },
      { id: 'giftlist-2', eventTypeIds: ['event-type-wedding'] },
    ])

    const result = await createGiftFlow({
      mode: 'admin',
      values: {
        ...values,
        giftlistIds: ['giftlist-1', 'giftlist-2'],
      },
      imageUrl: '',
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        giftlists: {
          connect: [{ id: 'giftlist-1' }, { id: 'giftlist-2' }],
        },
      }),
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('reports a wishlist-linking failure after creating a couple gift', async () => {
    mocks.wishlistGiftCreate.mockRejectedValue(
      new Error('No se pudo agregar el regalo a la lista')
    )

    const result = await createGiftFlow({
      mode: 'wishlist',
      values,
      imageUrl: '',
      eventId: 'event-1',
      wishlistId: 'wishlist-1',
    })

    expect(result).toEqual({
      error: 'No se pudo agregar el regalo a la lista',
      step: 'wishlist',
    })
  })

  it('rejects creating a default gift when the current user is not an admin', async () => {
    mocks.getCurrentUser.mockResolvedValue({ role: 'ORGANIZER' })

    const result = await createGiftFlow({
      mode: 'admin',
      values,
      imageUrl: '',
    })

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(result).toEqual({ error: 'No autorizado.', step: 'gift' })
  })
})
