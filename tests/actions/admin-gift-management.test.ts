import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  giftFindFirst: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  giftDelete: vi.fn(),
  wishlistGiftUpdate: vi.fn(),
  imageDeleteMany: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    gift: {
      findFirst: mocks.giftFindFirst,
      update: mocks.giftUpdate,
      create: mocks.giftCreate,
      delete: mocks.giftDelete,
    },
    wishlistGift: {
      update: mocks.wishlistGiftUpdate,
    },
    image: {
      deleteMany: mocks.imageDeleteMany,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

import {
  deleteDefaultGiftAsAdmin,
  editDefaultGiftAsAdmin,
} from '@/actions/data/gift'

const editValues = {
  name: 'Sofá living',
  categoryId: 'category-1',
  price: '850000',
  imageUrl: 'https://cdn.example.com/sofa.jpg',
}

describe('admin gift management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.giftFindFirst.mockResolvedValue({ id: 'gift-1' })
    mocks.giftUpdate.mockResolvedValue({ id: 'gift-1' })
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftDelete.mockResolvedValue({ id: 'gift-1' })
    mocks.wishlistGiftUpdate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.imageDeleteMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          gift: {
            findFirst: mocks.giftFindFirst,
            create: mocks.giftCreate,
            delete: mocks.giftDelete,
          },
          wishlistGift: { update: mocks.wishlistGiftUpdate },
          image: { deleteMany: mocks.imageDeleteMany },
        })
    )
  })

  it('rejects edits from a non-admin before reading the gift', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'ORGANIZER' })

    const result = await editDefaultGiftAsAdmin(editValues, 'gift-1')

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.giftFindFirst).not.toHaveBeenCalled()
  })

  it('rejects deletes from a non-admin before reading the gift', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'ORGANIZER' })

    const result = await deleteDefaultGiftAsAdmin('gift-1')

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.giftFindFirst).not.toHaveBeenCalled()
  })

  it('updates a default catalog gift and its image', async () => {
    const result = await editDefaultGiftAsAdmin(editValues, 'gift-1')

    expect(mocks.giftFindFirst).toHaveBeenCalledWith({
      where: { id: 'gift-1', isDefault: true },
      select: { id: true },
    })
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
      data: {
        name: editValues.name,
        categoryId: editValues.categoryId,
        price: editValues.price,
        image: {
          upsert: {
            create: { url: editValues.imageUrl },
            update: { url: editValues.imageUrl },
          },
        },
      },
    })
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('gives a referenced wishlist its own copy before deleting the catalog gift', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: 'Sofá living',
      price: '850000',
      categoryId: 'category-1',
      image: { url: 'https://cdn.example.com/sofa.jpg' },
      wishlistGifts: [{ id: 'wishlist-gift-1', eventId: 'event-1' }],
    })

    const result = await deleteDefaultGiftAsAdmin('gift-1')

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: {
        name: 'Sofá living',
        price: '850000',
        categoryId: 'category-1',
        eventId: 'event-1',
        isDefault: false,
        image: {
          create: { url: 'https://cdn.example.com/sofa.jpg' },
        },
      },
    })
    expect(mocks.wishlistGiftUpdate).toHaveBeenCalledWith({
      where: { id: 'wishlist-gift-1' },
      data: { giftId: 'private-gift-1' },
    })
    expect(mocks.giftDelete).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
    })
    expect(result).toEqual({ success: true })
  })

  it('deletes an unreferenced gift and its image record', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: 'Sofá living',
      price: '850000',
      categoryId: 'category-1',
      image: null,
      wishlistGifts: [],
    })

    const result = await deleteDefaultGiftAsAdmin('gift-1')

    expect(mocks.imageDeleteMany).toHaveBeenCalledWith({
      where: { giftId: 'gift-1' },
    })
    expect(mocks.giftDelete).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
    })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })
})
