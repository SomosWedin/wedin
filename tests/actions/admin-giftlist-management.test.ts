import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  giftFindMany: vi.fn(),
  giftUpdateMany: vi.fn(),
  giftlistCreate: vi.fn(),
  giftlistFindUnique: vi.fn(),
  giftlistUpdate: vi.fn(),
  giftlistDelete: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

vi.mock('@/prisma/client', () => ({
  default: {
    gift: {
      findMany: mocks.giftFindMany,
      updateMany: mocks.giftUpdateMany,
    },
    giftlist: {
      findUnique: mocks.giftlistFindUnique,
      create: mocks.giftlistCreate,
      update: mocks.giftlistUpdate,
      delete: mocks.giftlistDelete,
    },
    $transaction: mocks.transaction,
  },
}))

import {
  createAdminGiftlist,
  deleteAdminGiftlist,
  editAdminGiftlist,
} from '@/actions/data/giftlist'

describe('admin collection management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.giftlistCreate.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftlistFindUnique.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftlistUpdate.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftlistDelete.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftUpdateMany.mockResolvedValue({ count: 2 })
    mocks.transaction.mockImplementation(async callback =>
      callback({
        gift: {
          findMany: mocks.giftFindMany,
          updateMany: mocks.giftUpdateMany,
        },
        giftlist: {
          findUnique: mocks.giftlistFindUnique,
          create: mocks.giftlistCreate,
          update: mocks.giftlistUpdate,
          delete: mocks.giftlistDelete,
        },
      })
    )
  })

  it('creates an empty collection without manually assigned event types', async () => {
    const result = await createAdminGiftlist({
      name: '  Esenciales  ',
      giftIds: [],
    })

    expect(mocks.giftlistCreate).toHaveBeenCalledWith({
      data: {
        name: 'Esenciales',
        normalizedName: 'esenciales',
        gifts: { connect: [] },
      },
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ giftlistId: 'giftlist-1' })
  })

  it('creates a collection with selected catalog gifts', async () => {
    mocks.giftFindMany.mockResolvedValue([
      { id: 'gift-1', category: { eventTypeIds: ['wedding'] } },
      {
        id: 'gift-2',
        category: { eventTypeIds: ['wedding', 'birthday'] },
      },
    ])

    const result = await createAdminGiftlist({
      name: 'Esenciales',
      giftIds: ['gift-1', 'gift-2', 'gift-1'],
    })

    expect(mocks.giftFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['gift-1', 'gift-2'] },
        isDefault: true,
      },
      select: {
        id: true,
        category: { select: { eventTypeIds: true } },
      },
    })
    expect(mocks.giftlistCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gifts: { connect: [{ id: 'gift-1' }, { id: 'gift-2' }] },
      }),
    })
    expect(result).toEqual({ giftlistId: 'giftlist-1' })
  })

  it('edits the collection name and selected gifts', async () => {
    mocks.giftFindMany.mockResolvedValue([
      { id: 'gift-2', category: { eventTypeIds: ['wedding'] } },
    ])

    const result = await editAdminGiftlist('giftlist-1', {
      name: 'Esenciales',
      giftIds: ['gift-2'],
    })

    expect(mocks.giftlistUpdate).toHaveBeenCalledWith({
      where: { id: 'giftlist-1' },
      data: {
        name: 'Esenciales',
        normalizedName: 'esenciales',
        gifts: { set: [{ id: 'gift-2' }] },
      },
    })
    expect(result).toEqual({ giftlistId: 'giftlist-1' })
  })

  it('rejects editing a collection that does not exist', async () => {
    mocks.giftlistFindUnique.mockResolvedValue(null)

    const result = await editAdminGiftlist('giftlist-missing', {
      name: 'Esenciales',
      giftIds: [],
    })

    expect(result).toEqual({ error: 'Colección no encontrada.' })
    expect(mocks.giftlistUpdate).not.toHaveBeenCalled()
  })

  it('rejects gifts that are missing or are not catalog gifts', async () => {
    const result = await createAdminGiftlist({
      name: 'Esenciales',
      giftIds: ['private-or-missing-gift'],
    })

    expect(result).toEqual({
      error: 'Uno o más regalos seleccionados no existen en el catálogo.',
    })
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
  })

  it('rejects catalog gifts whose category has no event types', async () => {
    mocks.giftFindMany.mockResolvedValue([
      { id: 'gift-with-broken-category', category: { eventTypeIds: [] } },
    ])

    const result = await createAdminGiftlist({
      name: 'Esenciales',
      giftIds: ['gift-with-broken-category'],
    })

    expect(result).toEqual({
      error:
        'No se pueden guardar regalos cuya categoría no tiene tipos de evento asignados.',
    })
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
  })

  it('rejects gifts whose categories share no event type', async () => {
    mocks.giftFindMany.mockResolvedValue([
      { id: 'gift-wedding', category: { eventTypeIds: ['wedding'] } },
      { id: 'gift-baby', category: { eventTypeIds: ['baby-shower'] } },
    ])

    const result = await createAdminGiftlist({
      name: 'Incompatible',
      giftIds: ['gift-wedding', 'gift-baby'],
    })

    expect(result).toEqual({
      error: 'Los regalos seleccionados no comparten ningún tipo de evento.',
    })
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
  })

  it('disconnects gifts before deleting a collection', async () => {
    const result = await deleteAdminGiftlist('giftlist-1')

    expect(mocks.giftUpdateMany).not.toHaveBeenCalled()
    expect(mocks.giftlistDelete).toHaveBeenCalledWith({
      where: { id: 'giftlist-1' },
    })
    expect(mocks.giftlistUpdate).toHaveBeenCalledWith({
      where: { id: 'giftlist-1' },
      data: { gifts: { set: [] } },
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true })
  })
})
