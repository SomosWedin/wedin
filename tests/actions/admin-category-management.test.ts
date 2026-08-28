import { EventType } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryFindUnique: vi.fn(),
  categoryCreate: vi.fn(),
  categoryUpdate: vi.fn(),
  categoryDeleteMany: vi.fn(),
  giftFindFirst: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  giftCount: vi.fn(),
  giftlistFindFirst: vi.fn(),
  giftlistCreate: vi.fn(),
  giftlistDelete: vi.fn(),
  giftlistCount: vi.fn(),
  wishlistGiftUpdate: vi.fn(),
  transaction: vi.fn(),
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
    gift: {
      findFirst: mocks.giftFindFirst,
      update: mocks.giftUpdate,
      create: mocks.giftCreate,
      count: mocks.giftCount,
    },
    giftlist: {
      findFirst: mocks.giftlistFindFirst,
      create: mocks.giftlistCreate,
      delete: mocks.giftlistDelete,
      count: mocks.giftlistCount,
    },
    wishlistGift: { update: mocks.wishlistGiftUpdate },
    $transaction: mocks.transaction,
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  createAdminCategory,
  deleteAdminCategory,
  editAdminCategory,
} from '@/actions/data/category'
import { editAdminGift } from '@/actions/data/gift'

const values = { name: 'Hogar', eventType: EventType.WEDDING }
const giftEditValues = {
  name: 'Sofá living',
  categoryId: 'category-2',
  price: '850000',
  imageUrl: 'https://cdn.example.com/sofa.jpg',
}

describe('admin category management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.categoryFindFirst.mockResolvedValue(null)
    mocks.categoryFindUnique.mockResolvedValue({ id: 'category-1' })
    mocks.categoryCreate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryUpdate.mockResolvedValue({ id: 'category-1' })
    mocks.categoryDeleteMany.mockResolvedValue({ count: 1 })
    mocks.giftFindFirst.mockResolvedValue(null)
    mocks.giftUpdate.mockResolvedValue({ id: 'gift-1' })
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftCount.mockResolvedValue(0)
    mocks.giftlistFindFirst.mockResolvedValue(null)
    mocks.giftlistCreate.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftlistDelete.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftlistCount.mockResolvedValue(0)
    mocks.wishlistGiftUpdate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          gift: {
            findFirst: mocks.giftFindFirst,
            update: mocks.giftUpdate,
            create: mocks.giftCreate,
            count: mocks.giftCount,
          },
          giftlist: {
            findFirst: mocks.giftlistFindFirst,
            create: mocks.giftlistCreate,
            delete: mocks.giftlistDelete,
          },
          wishlistGift: { update: mocks.wishlistGiftUpdate },
        })
    )
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

  it('preserves every linked wishlist gift when changing only the catalog category', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: 'Sofá original',
      price: giftEditValues.price,
      categoryId: 'category-1',
      giftlistId: null,
      image: { url: 'https://cdn.example.com/original.jpg' },
      wishlistGifts: [
        { id: 'wishlist-gift-1', eventId: 'event-1' },
        { id: 'wishlist-gift-2', eventId: 'event-2' },
      ],
    })
    mocks.giftCreate
      .mockResolvedValueOnce({ id: 'private-gift-1' })
      .mockResolvedValueOnce({ id: 'private-gift-2' })

    const result = await editAdminGift(giftEditValues, 'gift-1')

    expect(mocks.giftCreate).toHaveBeenCalledTimes(2)
    expect(mocks.giftCreate).toHaveBeenNthCalledWith(1, {
      data: {
        name: 'Sofá original',
        price: '850000',
        categoryId: 'category-1',
        eventId: 'event-1',
        isDefault: false,
        image: { create: { url: 'https://cdn.example.com/original.jpg' } },
      },
    })
    expect(mocks.wishlistGiftUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'wishlist-gift-2' },
      data: { giftId: 'private-gift-2' },
    })
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
      data: expect.objectContaining({ categoryId: 'category-2' }),
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('creates one wishlist copy when price and category change together', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: 'Sofá original',
      price: '800000',
      categoryId: 'category-1',
      giftlistId: null,
      image: null,
      wishlistGifts: [{ id: 'wishlist-gift-1', eventId: 'event-1' }],
    })

    const result = await editAdminGift(giftEditValues, 'gift-1')

    expect(mocks.giftCreate).toHaveBeenCalledOnce()
    expect(mocks.wishlistGiftUpdate).toHaveBeenCalledOnce()
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
      data: expect.objectContaining({
        price: '850000',
        categoryId: 'category-2',
      }),
    })
    expect(result).toEqual({ giftId: 'gift-1' })
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
