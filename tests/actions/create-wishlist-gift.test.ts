import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  eventFindFirst: vi.fn(),
  giftFindMany: vi.fn(),
  giftlistFindFirst: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  revalidatePath: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.transaction,
    event: { findFirst: mocks.eventFindFirst },
    gift: { findMany: mocks.giftFindMany },
    giftlist: { findFirst: mocks.giftlistFindFirst },
    wishlistGift: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      create: mocks.create,
      createMany: mocks.createMany,
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
  applyTransactionStatusChange: vi.fn(),
}))

import {
  createWishlistGift,
  createWishlistGifts,
} from '@/actions/data/wishlist-gift'

const baseInput = {
  wishlistId: 'w1',
  eventId: 'e1',
  giftId: 'g1',
  isFavoriteGift: false,
}

describe('createWishlistGift quantity normalization', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.eventFindFirst.mockResolvedValue({
      id: 'e1',
      eventTypeId: 'event-type-wedding',
    })
    mocks.giftFindMany.mockResolvedValue([
      {
        id: 'g1',
        isDefault: true,
        eventId: null,
        category: { eventTypeIds: ['event-type-wedding'] },
      },
    ])
    mocks.giftlistFindFirst.mockResolvedValue({ giftIds: ['g1'] })
    mocks.findFirst.mockResolvedValue(null)
    mocks.findMany.mockResolvedValue([])
    mocks.create.mockResolvedValue({ id: 'wg1' })
    mocks.createMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(callback =>
      callback({
        event: { findFirst: mocks.eventFindFirst },
        gift: { findMany: mocks.giftFindMany },
        giftlist: { findFirst: mocks.giftlistFindFirst },
        wishlistGift: {
          findFirst: mocks.findFirst,
          findMany: mocks.findMany,
          create: mocks.create,
          createMany: mocks.createMany,
        },
      })
    )
  })

  it('rejects an unauthenticated mutation before starting a transaction', async () => {
    mocks.getCurrentUser.mockResolvedValue(null)

    const result = await createWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('checks that the current user belongs to the submitted event', async () => {
    await createWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(mocks.eventFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'e1',
        wishlistId: 'w1',
        users: { some: { id: 'user-1' } },
      },
      select: { id: true, eventTypeId: true },
    })
  })

  it('rejects a gift whose category does not support the event type', async () => {
    mocks.giftFindMany.mockResolvedValue([
      {
        id: 'g1',
        isDefault: true,
        eventId: null,
        category: { eventTypeIds: ['event-type-birthday'] },
      },
    ])

    const result = await createWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toEqual({
      error: 'Uno o más regalos no son compatibles con el tipo de evento.',
    })
    expect(mocks.create).not.toHaveBeenCalled()
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
      expect.objectContaining({
        data: expect.objectContaining({ quantity: 8 }),
      })
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

  it('rejects an event and wishlist that do not belong together', async () => {
    mocks.eventFindFirst.mockResolvedValue(null)

    const result = await createWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toEqual({
      error: 'No autorizado.',
    })
    expect(mocks.giftFindMany).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a private gift owned by another event', async () => {
    mocks.giftFindMany.mockResolvedValue([
      {
        id: 'g1',
        isDefault: false,
        eventId: 'e2',
        category: { eventTypeIds: ['event-type-wedding'] },
      },
    ])

    const result = await createWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toEqual({
      error: 'El regalo privado no pertenece a este evento.',
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects linking a private gift that already belongs to a wishlist', async () => {
    mocks.giftFindMany.mockResolvedValue([
      {
        id: 'g1',
        isDefault: false,
        eventId: 'e1',
        category: { eventTypeIds: ['event-type-wedding'] },
      },
    ])
    mocks.findFirst.mockResolvedValue({ id: 'existing-private-link' })

    const result = await createWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toEqual({
      error: 'El regalo privado ya pertenece a una lista de regalos.',
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })
})

describe('createWishlistGifts ownership constraints', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.eventFindFirst.mockResolvedValue({
      id: 'e1',
      eventTypeId: 'event-type-wedding',
    })
    mocks.giftFindMany.mockResolvedValue([
      {
        id: 'g1',
        isDefault: true,
        eventId: null,
        category: { eventTypeIds: ['event-type-wedding'] },
      },
    ])
    mocks.giftlistFindFirst.mockResolvedValue({ giftIds: ['g1'] })
    mocks.findFirst.mockResolvedValue(null)
    mocks.findMany.mockResolvedValue([])
    mocks.createMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(callback =>
      callback({
        event: { findFirst: mocks.eventFindFirst },
        gift: { findMany: mocks.giftFindMany },
        giftlist: { findFirst: mocks.giftlistFindFirst },
        wishlistGift: {
          findFirst: mocks.findFirst,
          findMany: mocks.findMany,
          createMany: mocks.createMany,
        },
      })
    )
  })

  it('validates and deduplicates catalog gifts before bulk linking', async () => {
    const result = await createWishlistGifts({
      wishlistId: 'w1',
      eventId: 'e1',
      giftlistId: 'list-1',
      giftIds: ['g1', 'g1'],
    })

    expect(mocks.giftFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['g1'] } },
      select: {
        id: true,
        isDefault: true,
        eventId: true,
        category: { select: { eventTypeIds: true } },
      },
    })
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [{ wishlistId: 'w1', giftId: 'g1', eventId: 'e1' }],
    })
    expect(result).toEqual({ success: true })
  })

  it('rejects a collection that does not support the event type', async () => {
    mocks.giftlistFindFirst.mockResolvedValue(null)

    const result = await createWishlistGifts({
      wishlistId: 'w1',
      eventId: 'e1',
      giftlistId: 'list-1',
      giftIds: ['g1'],
    })

    expect(mocks.giftlistFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'list-1',
        eventTypeIds: { has: 'event-type-wedding' },
      },
      select: { giftIds: true },
    })
    expect(result).toEqual({
      error: 'La colección no es compatible con el tipo de evento.',
    })
    expect(mocks.createMany).not.toHaveBeenCalled()
  })

  it('rejects submitted gifts that do not belong to the collection', async () => {
    mocks.giftlistFindFirst.mockResolvedValue({ giftIds: [] })

    const result = await createWishlistGifts({
      wishlistId: 'w1',
      eventId: 'e1',
      giftlistId: 'list-1',
      giftIds: ['g1'],
    })

    expect(result).toEqual({
      error: 'Uno o más regalos no pertenecen a la colección.',
    })
    expect(mocks.createMany).not.toHaveBeenCalled()
  })
})
