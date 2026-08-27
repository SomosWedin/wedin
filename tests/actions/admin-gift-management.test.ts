import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  giftFindFirst: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  giftDelete: vi.fn(),
  giftCount: vi.fn(),
  giftlistFindFirst: vi.fn(),
  giftlistCreate: vi.fn(),
  giftlistDelete: vi.fn(),
  wishlistGiftFindUnique: vi.fn(),
  wishlistGiftUpdate: vi.fn(),
  imageDeleteMany: vi.fn(),
  transaction: vi.fn(),
  recomputeWishlistGiftProgress: vi.fn(),
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
      count: mocks.giftCount,
    },
    giftlist: {
      findFirst: mocks.giftlistFindFirst,
      create: mocks.giftlistCreate,
      delete: mocks.giftlistDelete,
    },
    wishlistGift: {
      findUnique: mocks.wishlistGiftFindUnique,
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

vi.mock('@/actions/data/transaction', () => ({
  recomputeWishlistGiftProgress: mocks.recomputeWishlistGiftProgress,
}))

import {
  createAdminGift,
  createGift,
  deleteDefaultGiftAsAdmin,
  editAdminGift,
} from '@/actions/data/gift'

const editValues = {
  name: 'Sofá living',
  categoryId: 'category-1',
  price: '850000',
  imageUrl: 'https://cdn.example.com/sofa.jpg',
}

const createValues = { ...editValues }

describe('admin gift management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      price: editValues.price,
      giftlistId: null,
      wishlistGifts: [],
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'gift-1' })
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftDelete.mockResolvedValue({ id: 'gift-1' })
    mocks.giftCount.mockResolvedValue(1)
    mocks.giftlistFindFirst.mockResolvedValue(null)
    mocks.giftlistCreate.mockResolvedValue({ id: 'giftlist-new' })
    mocks.giftlistDelete.mockResolvedValue({ id: 'giftlist-old' })
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '800000' },
      isGroupGift: true,
      reservedQuantity: 0,
    })
    mocks.wishlistGiftUpdate.mockResolvedValue({ id: 'wishlist-gift-1' })
    mocks.imageDeleteMany.mockResolvedValue({ count: 1 })
    mocks.recomputeWishlistGiftProgress.mockResolvedValue(undefined)
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          gift: {
            findFirst: mocks.giftFindFirst,
            update: mocks.giftUpdate,
            create: mocks.giftCreate,
            delete: mocks.giftDelete,
            count: mocks.giftCount,
          },
          giftlist: {
            findFirst: mocks.giftlistFindFirst,
            create: mocks.giftlistCreate,
            delete: mocks.giftlistDelete,
          },
          wishlistGift: {
            findUnique: mocks.wishlistGiftFindUnique,
            update: mocks.wishlistGiftUpdate,
          },
          image: { deleteMany: mocks.imageDeleteMany },
        })
    )
  })

  it('rejects edits from a non-admin before reading the gift', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'ORGANIZER' })

    const result = await editAdminGift(editValues, 'gift-1')

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
    const result = await editAdminGift(editValues, 'gift-1')

    expect(mocks.giftFindFirst).toHaveBeenCalledWith({
      where: { id: 'gift-1', isDefault: true },
      select: {
        id: true,
        price: true,
        giftlistId: true,
        wishlistGifts: { select: { id: true } },
      },
    })
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
      data: {
        name: editValues.name,
        categoryId: editValues.categoryId,
        price: editValues.price,
        giftlistId: null,
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

  it('creates a default gift in an existing collection from the same category', async () => {
    mocks.giftlistFindFirst.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftCreate.mockResolvedValue({ id: 'gift-1' })

    const result = await createAdminGift({
      ...createValues,
      giftlistId: 'giftlist-1',
    })

    expect(mocks.giftlistFindFirst).toHaveBeenCalledWith({
      where: { id: 'giftlist-1', categoryId: 'category-1' },
      select: { id: true },
    })
    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        categoryId: 'category-1',
        giftlistId: 'giftlist-1',
        isDefault: true,
      }),
    })
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('creates a collection and assigns its first gift in one transaction', async () => {
    mocks.giftCreate.mockResolvedValue({ id: 'gift-1' })
    mocks.giftlistFindFirst.mockResolvedValue(null)

    const result = await createAdminGift({
      ...createValues,
      newGiftlistName: '  Esenciales del hogar  ',
    })

    expect(mocks.giftlistFindFirst).toHaveBeenCalledWith({
      where: {
        categoryId: 'category-1',
        name: { equals: 'Esenciales del hogar', mode: 'insensitive' },
      },
      select: { id: true },
    })
    expect(mocks.giftlistCreate).toHaveBeenCalledWith({
      data: {
        name: 'Esenciales del hogar',
        categoryId: 'category-1',
      },
      select: { id: true },
    })
    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ giftlistId: 'giftlist-new' }),
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('rejects a collection from a different category', async () => {
    const result = await createAdminGift({
      ...createValues,
      giftlistId: 'giftlist-other-category',
    })

    expect(result).toEqual({
      error:
        'La colección seleccionada no existe o no pertenece a esta categoría.',
    })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('rejects a duplicate collection name within the category', async () => {
    mocks.giftlistFindFirst.mockResolvedValue({ id: 'giftlist-existing' })

    const result = await createAdminGift({
      ...createValues,
      newGiftlistName: 'ESENCIALES DEL HOGAR',
    })

    expect(result).toEqual({
      error: 'Ya existe una colección con ese nombre en esta categoría.',
    })
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('creates a collection and moves the edited gift in one transaction', async () => {
    const result = await editAdminGift(
      {
        ...editValues,
        newGiftlistName: 'Esenciales del hogar',
      },
      'gift-1'
    )

    expect(mocks.giftlistCreate).toHaveBeenCalledWith({
      data: {
        name: 'Esenciales del hogar',
        categoryId: 'category-1',
      },
      select: { id: true },
    })
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
      data: expect.objectContaining({ giftlistId: 'giftlist-new' }),
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('keeps generic gift creation separate from collection creation', async () => {
    const valuesWithCollectionFields = {
      ...createValues,
      isDefault: false,
      eventId: 'event-1',
      giftlistId: 'giftlist-1',
      newGiftlistName: 'Esenciales del hogar',
    }

    const result = await createGift(valuesWithCollectionFields)

    expect(result).toEqual({ giftId: 'private-gift-1' })
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.giftlistFindFirst).not.toHaveBeenCalled()
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.not.objectContaining({ giftlistId: expect.anything() }),
    })
  })

  it('removes the previous collection when moving its final gift', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      price: editValues.price,
      giftlistId: 'giftlist-old',
      wishlistGifts: [],
    })
    mocks.giftlistFindFirst.mockResolvedValue({ id: 'giftlist-new' })
    mocks.giftCount.mockResolvedValue(0)

    const result = await editAdminGift(
      { ...editValues, giftlistId: 'giftlist-new' },
      'gift-1'
    )

    expect(mocks.giftCount).toHaveBeenCalledWith({
      where: { giftlistId: 'giftlist-old' },
    })
    expect(mocks.giftlistDelete).toHaveBeenCalledWith({
      where: { id: 'giftlist-old' },
    })
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('keeps the previous collection when it still contains gifts', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      price: editValues.price,
      giftlistId: 'giftlist-old',
      wishlistGifts: [],
    })
    mocks.giftlistFindFirst.mockResolvedValue({ id: 'giftlist-new' })

    await editAdminGift({ ...editValues, giftlistId: 'giftlist-new' }, 'gift-1')

    expect(mocks.giftCount).toHaveBeenCalledWith({
      where: { giftlistId: 'giftlist-old' },
    })
    expect(mocks.giftlistDelete).not.toHaveBeenCalled()
  })

  it('blocks a shared price change when a linked individual gift is reserved', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      price: '800000',
      wishlistGifts: [{ id: 'wishlist-gift-1' }],
    })
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '800000' },
      isGroupGift: false,
      reservedQuantity: 1,
    })

    const result = await editAdminGift(editValues, 'gift-1')

    expect(result).toEqual({
      error:
        'No se puede cambiar el precio de un regalo individual con unidades reservadas o vendidas.',
    })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(mocks.recomputeWishlistGiftProgress).not.toHaveBeenCalled()
  })

  it('recomputes every linked wishlist gift after a shared price change', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      price: '800000',
      wishlistGifts: [{ id: 'wishlist-gift-1' }, { id: 'wishlist-gift-2' }],
    })

    const result = await editAdminGift(editValues, 'gift-1')

    expect(mocks.wishlistGiftFindUnique).toHaveBeenCalledTimes(2)
    expect(mocks.recomputeWishlistGiftProgress).toHaveBeenNthCalledWith(
      1,
      'wishlist-gift-1'
    )
    expect(mocks.recomputeWishlistGiftProgress).toHaveBeenNthCalledWith(
      2,
      'wishlist-gift-2'
    )
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('skips price checks and progress updates when the price is unchanged', async () => {
    const result = await editAdminGift(editValues, 'gift-1')

    expect(mocks.wishlistGiftFindUnique).not.toHaveBeenCalled()
    expect(mocks.recomputeWishlistGiftProgress).not.toHaveBeenCalled()
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

  it('deletes an unreferenced gift, its image, and its empty collection', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: 'Sofá living',
      price: '850000',
      categoryId: 'category-1',
      giftlistId: 'giftlist-old',
      image: null,
      wishlistGifts: [],
    })
    mocks.giftCount.mockResolvedValue(0)

    const result = await deleteDefaultGiftAsAdmin('gift-1')

    expect(mocks.imageDeleteMany).toHaveBeenCalledWith({
      where: { giftId: 'gift-1' },
    })
    expect(mocks.giftDelete).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
    })
    expect(mocks.giftlistDelete).toHaveBeenCalledWith({
      where: { id: 'giftlist-old' },
    })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })
})
