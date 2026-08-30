import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
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
    mocks.giftlistFindUnique.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftlistUpdate.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftlistDelete.mockResolvedValue({ id: 'giftlist-1' })
    mocks.giftUpdateMany.mockResolvedValue({ count: 2 })
    mocks.transaction.mockImplementation(async callback =>
      callback({
        gift: { updateMany: mocks.giftUpdateMany },
        giftlist: {
          update: mocks.giftlistUpdate,
          delete: mocks.giftlistDelete,
        },
      })
    )
  })

  it('creates an empty collection without manually assigned event types', async () => {
    const result = await createAdminGiftlist({
      name: '  Esenciales  ',
    })

    expect(mocks.giftlistCreate).toHaveBeenCalledWith({
      data: {
        name: 'Esenciales',
        normalizedName: 'esenciales',
      },
    })
    expect(result).toEqual({ giftlistId: 'giftlist-1' })
  })

  it('edits only the collection name', async () => {
    const result = await editAdminGiftlist('giftlist-1', {
      name: 'Esenciales',
    })

    expect(mocks.giftlistUpdate).toHaveBeenCalledWith({
      where: { id: 'giftlist-1' },
      data: {
        name: 'Esenciales',
        normalizedName: 'esenciales',
      },
    })
    expect(result).toEqual({ giftlistId: 'giftlist-1' })
  })

  it('rejects editing a collection that does not exist', async () => {
    mocks.giftlistFindUnique.mockResolvedValue(null)

    const result = await editAdminGiftlist('giftlist-missing', {
      name: 'Esenciales',
    })

    expect(result).toEqual({ error: 'Colección no encontrada.' })
    expect(mocks.giftlistUpdate).not.toHaveBeenCalled()
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
