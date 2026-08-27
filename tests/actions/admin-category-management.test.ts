import { EventType } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryFindUnique: vi.fn(),
  categoryCreate: vi.fn(),
  categoryUpdate: vi.fn(),
  categoryDeleteMany: vi.fn(),
  giftCount: vi.fn(),
  giftlistCount: vi.fn(),
  revalidatePath: vi.fn(),
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
      deleteMany: mocks.categoryDeleteMany,
    },
    gift: { count: mocks.giftCount },
    giftlist: { count: mocks.giftlistCount },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  createAdminCategory,
  deleteAdminCategory,
  editAdminCategory,
} from '@/actions/data/category'

const values = { name: 'Hogar', eventType: EventType.WEDDING }

describe('admin category management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.categoryFindFirst.mockResolvedValue(null)
    mocks.categoryFindUnique.mockResolvedValue({ id: 'category-1' })
    mocks.categoryCreate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryUpdate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryDeleteMany.mockResolvedValue({ count: 1 })
    mocks.giftCount.mockResolvedValue(0)
    mocks.giftlistCount.mockResolvedValue(0)
  })

  it('creates an admin category and trims its name', async () => {
    const result = await createAdminCategory({
      ...values,
      name: '  Hogar  ',
    })

    expect(mocks.categoryCreate).toHaveBeenCalledWith({
      data: values,
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('allows the same name for a different event type', async () => {
    const result = await createAdminCategory({
      ...values,
      eventType: EventType.OTHER,
    })

    expect(mocks.categoryFindFirst).toHaveBeenCalledWith({
      where: {
        name: { equals: 'Hogar', mode: 'insensitive' },
        eventType: EventType.OTHER,
      },
      select: { id: true },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('keeps linked gifts and wishlist records untouched when editing type', async () => {
    const result = await editAdminCategory('category-1', {
      ...values,
      eventType: EventType.OTHER,
    })

    expect(mocks.categoryUpdate).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { ...values, eventType: EventType.OTHER },
    })
    expect(result).toEqual({ categoryId: 'category-1' })
  })

  it('blocks deletion when gifts or collections reference the category', async () => {
    mocks.giftCount.mockResolvedValue(1)

    const result = await deleteAdminCategory('category-1')

    expect(result).toEqual({
      error:
        'No se puede eliminar una categoría que todavía tiene regalos o colecciones asociadas.',
    })
    expect(mocks.categoryDeleteMany).not.toHaveBeenCalled()
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
