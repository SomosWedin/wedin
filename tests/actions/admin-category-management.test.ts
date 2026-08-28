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
  giftCount: vi.fn(),
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
      count: mocks.giftCount,
    },
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
    mocks.categoryFindUnique.mockResolvedValue({ id: 'category-1' })
    mocks.categoryCreate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryUpdate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryDelete.mockResolvedValue({ id: 'category-1' })
    mocks.eventTypeFindMany.mockResolvedValue([{ id: 'event-type-wedding' }])
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftCount.mockResolvedValue(0)
    mocks.transaction.mockImplementation(async callback =>
      callback({
        category: {
          findUnique: mocks.categoryFindUnique,
          update: mocks.categoryUpdate,
          delete: mocks.categoryDelete,
        },
        gift: { count: mocks.giftCount },
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

  it('blocks removing a type required by a collection containing its gifts', async () => {
    mocks.giftFindMany.mockResolvedValue([
      { giftlist: { eventTypeIds: ['event-type-other'] } },
    ])

    const result = await editAdminCategory('category-1', values)

    expect(result).toEqual({
      error:
        'Esta categoría tiene regalos en colecciones que requieren tipos de evento que no seleccionaste.',
    })
    expect(mocks.categoryUpdate).not.toHaveBeenCalled()
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
