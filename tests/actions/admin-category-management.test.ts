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
  giftlistFindMany: vi.fn(),
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
    giftlist: { findMany: mocks.giftlistFindMany },
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
    mocks.giftlistFindMany.mockResolvedValue([])
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
        giftlist: { findMany: mocks.giftlistFindMany },
      })
    )
  })

  it('creates an admin category and trims its name', async () => {
    const result = await createAdminCategory({ ...values, name: '  Hogar  ' })

    expect(mocks.categoryCreate).toHaveBeenCalledWith({
      data: {
        name: 'Hogar',
        normalizedName: 'hogar',
        eventTypes: { connect: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('rejects the same category name even for different event types', async () => {
    mocks.eventTypeFindMany.mockResolvedValue([{ id: 'event-type-other' }])
    mocks.categoryFindFirst.mockResolvedValue({ id: 'category-existing' })

    const result = await createAdminCategory({
      name: 'Hogar',
      eventTypeIds: ['event-type-other'],
    })

    expect(mocks.categoryFindFirst).toHaveBeenCalledWith({
      where: {
        normalizedName: 'hogar',
      },
      select: { id: true },
    })
    expect(result).toEqual({
      error: 'Ya existe una categoría con ese nombre.',
    })
  })

  it('rejects the same name when at least one event type overlaps', async () => {
    mocks.categoryFindFirst.mockResolvedValue({ id: 'category-existing' })

    const result = await createAdminCategory(values)

    expect(result).toEqual({
      error: 'Ya existe una categoría con ese nombre.',
    })
  })

  it('keeps gifts and wishlist records untouched when editing types', async () => {
    const result = await editAdminCategory('category-1', values)

    expect(mocks.categoryUpdate).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: {
        name: 'Hogar',
        normalizedName: 'hogar',
        eventTypes: { set: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('renames the shared category without cloning or relinking wishlist gifts', async () => {
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Living',
      eventTypeIds: ['event-type-wedding'],
    })

    const result = await editAdminCategory('category-1', values)

    expect(mocks.categoryCreate).not.toHaveBeenCalled()
    expect(mocks.giftFindMany).not.toHaveBeenCalled()
    expect(mocks.giftlistFindMany).not.toHaveBeenCalled()
    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalled()
    expect(mocks.categoryUpdate).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: {
        name: 'Hogar',
        normalizedName: 'hogar',
        eventTypes: { set: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('updates shared event types without cloning catalog or private gifts', async () => {
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Hogar',
      eventTypeIds: ['event-type-wedding', 'event-type-birthday'],
    })

    const result = await editAdminCategory('category-1', values)

    expect(mocks.categoryCreate).not.toHaveBeenCalled()
    expect(mocks.giftFindMany).not.toHaveBeenCalled()
    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalled()
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('removes category gifts from collections made incompatible by an event type edit', async () => {
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Hogar',
      eventTypeIds: ['event-type-wedding', 'event-type-baby'],
    })
    mocks.giftlistFindMany.mockResolvedValue([
      {
        id: 'giftlist-1',
        name: 'Mixta',
        gifts: [
          {
            id: 'gift-1',
            categoryId: 'category-1',
            category: {
              eventTypeIds: ['event-type-wedding', 'event-type-baby'],
            },
          },
          {
            id: 'gift-2',
            categoryId: 'category-baby',
            category: { eventTypeIds: ['event-type-baby'] },
          },
        ],
      },
    ])

    const result = await editAdminCategory('category-1', values)

    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
      data: { giftlists: { disconnect: [{ id: 'giftlist-1' }] } },
    })
    expect(result).toEqual({
      categoryId: 'category-1',
      removedGiftlists: [{ id: 'giftlist-1', name: 'Mixta' }],
    })
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
