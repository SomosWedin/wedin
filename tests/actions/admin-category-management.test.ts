import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryFindUnique: vi.fn(),
  categoryCreate: vi.fn(),
  categoryUpdate: vi.fn(),
  categoryDelete: vi.fn(),
  eventTypeFindMany: vi.fn(),
  giftFindMany: vi.fn(),
  giftCreate: vi.fn(),
  giftUpdate: vi.fn(),
  giftCount: vi.fn(),
  wishlistGiftUpdate: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    category: {
      findFirst: mocks.categoryFindFirst,
      findUnique: mocks.categoryFindUnique,
      create: mocks.categoryCreate,
      update: mocks.categoryUpdate,
      delete: mocks.categoryDelete,
    },
    $transaction: mocks.transaction,
    eventType: { findMany: mocks.eventTypeFindMany },
    gift: {
      findMany: mocks.giftFindMany,
      create: mocks.giftCreate,
      update: mocks.giftUpdate,
      count: mocks.giftCount,
    },
    wishlistGift: { update: mocks.wishlistGiftUpdate },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  createAdminCategory,
  deleteAdminCategory,
  editAdminCategory,
} from '@/actions/data/category'

const values = { name: 'Hogar', eventTypeIds: ['event-type-wedding'] }

describe('admin category management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.categoryFindFirst.mockResolvedValue(null)
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Hogar',
      eventTypeIds: ['event-type-wedding'],
    })
    mocks.categoryCreate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryUpdate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryDelete.mockResolvedValue({ id: 'category-1' })
    mocks.eventTypeFindMany.mockResolvedValue([{ id: 'event-type-wedding' }])
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftUpdate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftCount.mockResolvedValue(0)
    mocks.wishlistGiftUpdate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.transaction.mockImplementation(async callback =>
      callback({
        category: {
          findFirst: mocks.categoryFindFirst,
          findUnique: mocks.categoryFindUnique,
          create: mocks.categoryCreate,
          update: mocks.categoryUpdate,
          delete: mocks.categoryDelete,
        },
        gift: {
          findMany: mocks.giftFindMany,
          create: mocks.giftCreate,
          update: mocks.giftUpdate,
          count: mocks.giftCount,
        },
        wishlistGift: { update: mocks.wishlistGiftUpdate },
      })
    )
  })

  it('creates an admin category and trims its name', async () => {
    const result = await createAdminCategory({ ...values, name: '  Hogar  ' })

    expect(mocks.categoryCreate).toHaveBeenCalledWith({
      data: {
        name: 'Hogar',
        eventTypes: { connect: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('allows the same name for disjoint event types', async () => {
    mocks.eventTypeFindMany.mockResolvedValue([{ id: 'event-type-other' }])

    const result = await createAdminCategory({
      name: 'Hogar',
      eventTypeIds: ['event-type-other'],
    })

    expect(mocks.categoryFindFirst).toHaveBeenCalledWith({
      where: {
        name: { equals: 'Hogar', mode: 'insensitive' },
        eventTypeIds: { hasSome: ['event-type-other'] },
      },
      select: { id: true },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('rejects the same name when at least one event type overlaps', async () => {
    mocks.categoryFindFirst.mockResolvedValue({ id: 'category-existing' })

    const result = await createAdminCategory(values)

    expect(result).toEqual({
      error: 'Ya existe una categoría con ese nombre para ese tipo de evento.',
    })
  })

  it('keeps gifts and wishlist records untouched when editing types', async () => {
    const result = await editAdminCategory('category-1', values)

    expect(mocks.categoryUpdate).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: {
        name: 'Hogar',
        eventTypes: { set: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('preserves the old category and gift values for linked wishlists before renaming it', async () => {
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Living',
      eventTypeIds: ['event-type-wedding'],
    })
    mocks.categoryCreate.mockResolvedValue({ id: 'category-preserved' })
    mocks.giftFindMany.mockResolvedValueOnce([
      {
        id: 'gift-1',
        name: 'Sofá',
        price: '850000',
        categoryId: 'category-1',
        isDefault: true,
        image: { url: 'https://cdn.example.com/sofa.jpg' },
        wishlistGifts: [
          {
            id: 'wishlist-gift-1',
            eventId: 'event-1',
            event: { eventTypeId: 'event-type-wedding' },
          },
        ],
      },
    ])

    const result = await editAdminCategory('category-1', values)

    expect(mocks.categoryCreate).toHaveBeenCalledWith({
      data: {
        name: 'Living',
        eventTypes: { connect: [{ id: 'event-type-wedding' }] },
      },
      select: { id: true },
    })
    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Sofá',
        price: '850000',
        category: { connect: { id: 'category-preserved' } },
        isDefault: false,
      }),
    })
    expect(mocks.wishlistGiftUpdate).toHaveBeenCalledWith({
      where: { id: 'wishlist-gift-1' },
      data: { giftId: 'private-gift-1' },
    })
    expect(mocks.categoryUpdate).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: {
        name: 'Hogar',
        eventTypes: { set: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('preserves only wishlists whose event type is removed from a category', async () => {
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Hogar',
      eventTypeIds: ['event-type-wedding', 'event-type-birthday'],
    })
    mocks.categoryCreate.mockResolvedValue({ id: 'category-preserved' })
    mocks.giftFindMany.mockResolvedValueOnce([
      {
        id: 'gift-1',
        name: 'Sofá',
        price: '850000',
        categoryId: 'category-1',
        isDefault: true,
        image: null,
        wishlistGifts: [
          {
            id: 'wishlist-wedding',
            eventId: 'event-wedding',
            event: { eventTypeId: 'event-type-wedding' },
          },
          {
            id: 'wishlist-birthday',
            eventId: 'event-birthday',
            event: { eventTypeId: 'event-type-birthday' },
          },
        ],
      },
    ])

    const result = await editAdminCategory('category-1', values)

    expect(mocks.categoryCreate).toHaveBeenCalledWith({
      data: {
        name: 'Hogar',
        eventTypes: { connect: [{ id: 'event-type-birthday' }] },
      },
      select: { id: true },
    })
    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event: { connect: { id: 'event-birthday' } },
      }),
    })
    expect(mocks.wishlistGiftUpdate).toHaveBeenCalledWith({
      where: { id: 'wishlist-birthday' },
      data: { giftId: 'private-gift-1' },
    })
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'wishlist-wedding' } })
    )
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('moves an existing private gift to the preserved category without copying it again', async () => {
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Living',
      eventTypeIds: ['event-type-wedding'],
    })
    mocks.categoryCreate.mockResolvedValue({ id: 'category-preserved' })
    mocks.giftFindMany.mockResolvedValueOnce([
      {
        id: 'private-gift-1',
        name: 'Sofá personalizado',
        price: '850000',
        categoryId: 'category-1',
        isDefault: false,
        eventId: 'event-1',
        image: null,
        wishlistGifts: [
          {
            id: 'wishlist-gift-1',
            eventId: 'event-1',
            event: { eventTypeId: 'event-type-wedding' },
          },
        ],
      },
    ])

    const result = await editAdminCategory('category-1', values)

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalled()
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'private-gift-1' },
      data: expect.objectContaining({
        category: { connect: { id: 'category-preserved' } },
      }),
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('blocks deletion when gifts reference the category', async () => {
    mocks.giftCount.mockResolvedValue(1)

    const result = await deleteAdminCategory('category-1')

    expect(result).toEqual({
      error:
        'No se puede eliminar una categoría que todavía tiene regalos asociados.',
    })
    expect(mocks.categoryDelete).not.toHaveBeenCalled()
  })

  it('disconnects event types before deleting an unused category', async () => {
    const result = await deleteAdminCategory('category-1')

    expect(mocks.categoryUpdate).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { eventTypes: { set: [] } },
    })
    expect(mocks.categoryDelete).toHaveBeenCalledWith({
      where: { id: 'category-1' },
    })
    expect(result).toEqual({ success: true })
  })

  it('rejects non-admin mutations', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'ORGANIZER' })

    await expect(createAdminCategory(values)).resolves.toEqual({
      error: 'No autorizado.',
    })
    await expect(editAdminCategory('category-1', values)).resolves.toEqual({
      error: 'No autorizado.',
    })
    await expect(deleteAdminCategory('category-1')).resolves.toEqual({
      error: 'No autorizado.',
    })
  })
})
