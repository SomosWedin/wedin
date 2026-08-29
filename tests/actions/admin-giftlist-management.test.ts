import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventTypeFindMany: vi.fn(),
  giftFindMany: vi.fn(),
  giftUpdateMany: vi.fn(),
  categoryFindMany: vi.fn(),
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
    eventType: { findMany: mocks.eventTypeFindMany },
    gift: {
      findMany: mocks.giftFindMany,
      updateMany: mocks.giftUpdateMany,
    },
    category: { findMany: mocks.categoryFindMany },
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
    mocks.eventTypeFindMany.mockResolvedValue([{ id: 'event-type-wedding' }])
    mocks.giftFindMany.mockResolvedValue([{ categoryId: 'category-1' }])
    mocks.categoryFindMany.mockResolvedValue([
      { eventTypeIds: ['event-type-wedding', 'event-type-other'] },
    ])
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

  it('creates a collection with event types', async () => {
    const result = await createAdminGiftlist({
      name: '  Esenciales  ',
      eventTypeIds: ['event-type-wedding'],
    })

    expect(mocks.giftlistCreate).toHaveBeenCalledWith({
      data: {
        name: 'Esenciales',
        normalizedName: 'esenciales',
        eventTypes: { connect: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ giftlistId: 'giftlist-1' })
  })

  it('assigns only event types supported by every gift category', async () => {
    const result = await editAdminGiftlist('giftlist-1', {
      name: 'Esenciales',
      eventTypeIds: ['event-type-wedding'],
    })

    expect(mocks.giftlistUpdate).toHaveBeenCalledWith({
      where: { id: 'giftlist-1' },
      data: {
        name: 'Esenciales',
        normalizedName: 'esenciales',
        eventTypes: { set: [{ id: 'event-type-wedding' }] },
      },
    })
    expect(result).toEqual({ giftlistId: 'giftlist-1' })
  })

  it('rejects an event type missing from one gift category', async () => {
    mocks.categoryFindMany.mockResolvedValue([
      { eventTypeIds: ['event-type-other'] },
    ])

    const result = await editAdminGiftlist('giftlist-1', {
      name: 'Esenciales',
      eventTypeIds: ['event-type-wedding'],
    })

    expect(result).toEqual({
      error:
        'Los tipos de evento elegidos no son compatibles con las categorías de todos los regalos de esta colección.',
    })
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
      data: { eventTypes: { set: [] }, gifts: { set: [] } },
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true })
  })
})
