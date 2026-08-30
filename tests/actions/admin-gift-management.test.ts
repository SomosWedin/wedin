import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  giftFindFirst: vi.fn(),
  giftFindMany: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  giftDelete: vi.fn(),
  giftCount: vi.fn(),
  giftlistFindMany: vi.fn(),
  giftlistFindFirst: vi.fn(),
  giftlistCreate: vi.fn(),
  giftlistUpdate: vi.fn(),
  giftlistDelete: vi.fn(),
  categoryFindUnique: vi.fn(),
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
      findMany: mocks.giftFindMany,
      update: mocks.giftUpdate,
      create: mocks.giftCreate,
      delete: mocks.giftDelete,
      count: mocks.giftCount,
    },
    giftlist: {
      findMany: mocks.giftlistFindMany,
      findFirst: mocks.giftlistFindFirst,
      create: mocks.giftlistCreate,
      update: mocks.giftlistUpdate,
      delete: mocks.giftlistDelete,
    },
    category: { findUnique: mocks.categoryFindUnique },
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
  deleteDefaultGiftAsAdmin,
  editAdminGift,
} from '@/actions/data/gift'

const editValues = {
  name: 'Sofá living',
  categoryId: 'category-1',
  price: '850000',
  imageUrl: 'https://cdn.example.com/sofa.jpg',
  giftlistIds: [],
}

const createValues = { ...editValues }

describe('admin creates and edits catalog gifts', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      price: editValues.price,
      giftlistIds: [],
      wishlistGifts: [],
    })
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftUpdate.mockResolvedValue({ id: 'gift-1' })
    mocks.giftCreate.mockResolvedValue({ id: 'private-gift-1' })
    mocks.giftDelete.mockResolvedValue({ id: 'gift-1' })
    mocks.giftCount.mockResolvedValue(1)
    mocks.giftlistFindFirst.mockResolvedValue(null)
    mocks.giftlistFindMany.mockResolvedValue([])
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      eventTypeIds: ['event-type-wedding'],
    })
    mocks.giftlistCreate.mockResolvedValue({ id: 'giftlist-new' })
    mocks.giftlistUpdate.mockResolvedValue({ id: 'giftlist-old' })
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
            findMany: mocks.giftFindMany,
            update: mocks.giftUpdate,
            create: mocks.giftCreate,
            delete: mocks.giftDelete,
            count: mocks.giftCount,
          },
          giftlist: {
            findMany: mocks.giftlistFindMany,
            findFirst: mocks.giftlistFindFirst,
            create: mocks.giftlistCreate,
            update: mocks.giftlistUpdate,
            delete: mocks.giftlistDelete,
          },
          category: { findUnique: mocks.categoryFindUnique },
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

  it('rejects creating a catalog gift with a nonexistent category', async () => {
    mocks.categoryFindUnique.mockResolvedValue(null)

    const result = await createAdminGift(createValues)

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'La categoría seleccionada no existe.',
    })
  })

  it('rejects moving a catalog gift to a nonexistent category', async () => {
    mocks.categoryFindUnique.mockResolvedValue(null)

    const result = await editAdminGift(editValues, 'gift-1')

    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'La categoría seleccionada no existe.',
    })
  })

  it('rejects a duplicate catalog gift name in the same category', async () => {
    mocks.giftFindMany.mockResolvedValue([{ id: 'gift-existing' }])

    const result = await createAdminGift({
      ...createValues,
      name: '  SOFÁ LIVING  ',
      price: '999000',
    })

    expect(mocks.giftFindMany).toHaveBeenCalledWith({
      where: {
        categoryId: 'category-1',
        isDefault: true,
        name: { equals: 'SOFÁ LIVING', mode: 'insensitive' },
      },
      select: { id: true },
      take: 1,
    })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'Ya existe un regalo con ese nombre en esta categoría.',
    })
  })

  it('rejects renaming a catalog gift to a duplicate in its category', async () => {
    mocks.giftFindMany.mockResolvedValue([{ id: 'gift-existing' }])

    const result = await editAdminGift(editValues, 'gift-1')

    expect(mocks.giftFindMany).toHaveBeenCalledWith({
      where: {
        id: { not: 'gift-1' },
        categoryId: 'category-1',
        isDefault: true,
        name: { equals: 'Sofá living', mode: 'insensitive' },
      },
      select: { id: true },
      take: 1,
    })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({
      error: 'Ya existe un regalo con ese nombre en esta categoría.',
    })
  })

  it('allows an admin to edit a default catalog gift and its image', async () => {
    const result = await editAdminGift(editValues, 'gift-1')

    expect(mocks.giftFindFirst).toHaveBeenCalledWith({
      where: { id: 'gift-1', isDefault: true },
      select: {
        id: true,
        name: true,
        price: true,
        categoryId: true,
        giftlistIds: true,
        image: { select: { url: true } },
        wishlistGifts: { select: { id: true, eventId: true } },
      },
    })
    expect(mocks.giftUpdate).toHaveBeenCalledWith({
      where: { id: 'gift-1' },
      data: expect.objectContaining({
        name: editValues.name,
        price: editValues.price,
        category: { connect: { id: editValues.categoryId } },
        giftlists: { set: [] },
        image: {
          upsert: {
            create: { url: editValues.imageUrl },
            update: { url: editValues.imageUrl },
          },
        },
      }),
    })
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('allows an admin to add a gift to an existing collection from another category', async () => {
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'giftlist-1', eventTypeIds: ['event-type-wedding'] },
    ])
    mocks.giftCreate.mockResolvedValue({ id: 'gift-1' })

    const result = await createAdminGift({
      ...createValues,
      giftlistIds: ['giftlist-1'],
    })

    expect(mocks.giftlistFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['giftlist-1'] } },
      select: { id: true },
    })
    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: { connect: { id: 'category-1' } },
        giftlists: { connect: [{ id: 'giftlist-1' }] },
        isDefault: true,
      }),
    })
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it('creates a gift in multiple compatible collections', async () => {
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'giftlist-wedding', eventTypeIds: ['event-type-wedding'] },
      { id: 'giftlist-birthday', eventTypeIds: ['event-type-birthday'] },
    ])
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'category-1',
      eventTypeIds: ['event-type-wedding', 'event-type-birthday'],
    })

    const result = await createAdminGift({
      ...createValues,
      giftlistIds: ['giftlist-wedding', 'giftlist-birthday'],
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        giftlists: {
          connect: [{ id: 'giftlist-wedding' }, { id: 'giftlist-birthday' }],
        },
      }),
    })
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('rejects a collection that does not exist', async () => {
    const result = await createAdminGift({
      ...createValues,
      giftlistIds: ['giftlist-missing'],
    })

    expect(result).toEqual({
      error: 'Una o más colecciones seleccionadas no existen.',
    })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('deduplicates selected collection ids before creating the gift', async () => {
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'giftlist-1', eventTypeIds: ['event-type-wedding'] },
    ])

    await createAdminGift({
      ...createValues,
      giftlistIds: ['giftlist-1', 'giftlist-1'],
    })

    expect(mocks.giftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        giftlists: { connect: [{ id: 'giftlist-1' }] },
      }),
    })
  })

  it('allows adding a gift from another category without synchronizing collection types', async () => {
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'giftlist-birthday', eventTypeIds: ['event-type-birthday'] },
    ])

    const result = await createAdminGift({
      ...createValues,
      giftlistIds: ['giftlist-birthday'],
    })

    expect(mocks.giftCreate).toHaveBeenCalled()
    expect(mocks.giftlistUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ giftId: 'private-gift-1' })
  })

  it('copies the old gift once per linked event before changing the catalog price', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: 'Sofá original',
      price: '800000',
      categoryId: 'category-1',
      image: { url: 'https://cdn.example.com/original.jpg' },
      wishlistGifts: [
        { id: 'wishlist-gift-1', eventId: 'event-1' },
        { id: 'wishlist-gift-2', eventId: 'event-2' },
      ],
    })

    const result = await editAdminGift(editValues, 'gift-1')

    expect(mocks.giftCreate).toHaveBeenCalledTimes(2)
    expect(mocks.wishlistGiftUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.giftCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        name: 'Sofá original',
        price: '800000',
        category: { connect: { id: 'category-1' } },
        event: { connect: { id: 'event-1' } },
        giftlists: { connect: [] },
        isDefault: false,
        image: { create: { url: 'https://cdn.example.com/original.jpg' } },
      }),
    })
    expect(mocks.wishlistGiftUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'wishlist-gift-2' },
      data: { giftId: 'private-gift-1' },
    })
    expect(mocks.giftUpdate).toHaveBeenCalled()
    expect(mocks.recomputeWishlistGiftProgress).not.toHaveBeenCalled()
    expect(result).toEqual({ giftId: 'gift-1' })
  })

  it.each([
    {
      field: 'name',
      existing: {
        name: 'Sofá original',
        price: editValues.price,
        categoryId: editValues.categoryId,
        image: { url: editValues.imageUrl },
      },
    },
    {
      field: 'image',
      existing: {
        name: editValues.name,
        price: editValues.price,
        categoryId: editValues.categoryId,
        image: { url: 'https://cdn.example.com/original.jpg' },
      },
    },
  ])(
    'copies and relinks the old gift before an admin changes only its $field',
    async ({ existing }) => {
      mocks.giftFindFirst.mockResolvedValue({
        id: 'gift-1',
        giftlistIds: [],
        wishlistGifts: [{ id: 'wishlist-gift-1', eventId: 'event-1' }],
        ...existing,
      })

      const result = await editAdminGift(editValues, 'gift-1')

      expect(mocks.giftCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: existing.name,
          price: existing.price,
          category: { connect: { id: existing.categoryId } },
          ...(existing.image
            ? { image: { create: { url: existing.image.url } } }
            : {}),
        }),
      })
      expect(mocks.wishlistGiftUpdate).toHaveBeenCalledWith({
        where: { id: 'wishlist-gift-1' },
        data: { giftId: 'private-gift-1' },
      })
      expect(mocks.giftUpdate).toHaveBeenCalledOnce()
      expect(result).toEqual({ giftId: 'gift-1' })
    }
  )

  it('does not create wishlist copies when only collections change', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: editValues.name,
      price: editValues.price,
      categoryId: editValues.categoryId,
      giftlistIds: [],
      image: { url: editValues.imageUrl },
      wishlistGifts: [{ id: 'wishlist-gift-1', eventId: 'event-1' }],
    })
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'giftlist-1', eventTypeIds: ['event-type-wedding'] },
    ])

    const result = await editAdminGift(
      { ...editValues, giftlistIds: ['giftlist-1'] },
      'gift-1'
    )

    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalled()
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
      data: expect.objectContaining({
        name: 'Sofá living',
        price: '850000',
        category: { connect: { id: 'category-1' } },
        event: { connect: { id: 'event-1' } },
        giftlists: { connect: [] },
        isDefault: false,
        image: {
          create: { url: 'https://cdn.example.com/sofa.jpg' },
        },
      }),
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

  it('deletes an unreferenced gift and its image without deleting collections', async () => {
    mocks.giftFindFirst.mockResolvedValue({
      id: 'gift-1',
      name: 'Sofá living',
      price: '850000',
      categoryId: 'category-1',
      giftlistIds: ['giftlist-old'],
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
    expect(mocks.giftlistDelete).not.toHaveBeenCalled()
    expect(mocks.giftlistUpdate).not.toHaveBeenCalled()
    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.wishlistGiftUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })
})
