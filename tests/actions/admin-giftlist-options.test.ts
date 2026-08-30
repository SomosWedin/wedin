import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  giftlistFindMany: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    giftlist: { findMany: mocks.giftlistFindMany },
  },
}))

import {
  getAdminGiftlists,
  getGiftlistOptionsForAdmin,
} from '@/actions/data/giftlist'

describe('admin gift list options', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.giftlistFindMany.mockResolvedValue([
      {
        id: 'giftlist-1',
        name: 'Hogar',
        gifts: [{ category: { eventTypeIds: ['event-type-wedding'] } }],
      },
    ])
  })

  it('returns lightweight collection options for admins', async () => {
    const result = await getGiftlistOptionsForAdmin()

    expect(mocks.giftlistFindMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        gifts: {
          select: { category: { select: { eventTypeIds: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })
    expect(result).toEqual([
      {
        id: 'giftlist-1',
        name: 'Hogar',
        eventTypeIds: ['event-type-wedding'],
      },
    ])
  })

  it('rejects non-admin callers before querying collections', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'organizer-1',
      role: 'ORGANIZER',
    })

    const result = await getGiftlistOptionsForAdmin()

    expect(result).toEqual([])
    expect(mocks.giftlistFindMany).not.toHaveBeenCalled()
  })

  it('derives collection event types shared by every gift category', async () => {
    mocks.giftlistFindMany.mockResolvedValue([
      {
        id: 'giftlist-1',
        name: 'Hogar',
        normalizedName: 'hogar',
        giftIds: ['gift-1', 'gift-2'],
        gifts: [
          {
            id: 'gift-1',
            categoryId: 'category-1',
            category: {
              eventTypeIds: ['wedding', 'birthday'],
              eventTypes: [
                { id: 'wedding', name: 'Casamiento' },
                { id: 'birthday', name: 'Cumpleaños' },
              ],
            },
          },
          {
            id: 'gift-2',
            categoryId: 'category-2',
            category: {
              eventTypeIds: ['wedding'],
              eventTypes: [{ id: 'wedding', name: 'Casamiento' }],
            },
          },
        ],
      },
    ])

    const result = await getAdminGiftlists()

    expect(result).toEqual([
      {
        id: 'giftlist-1',
        name: 'Hogar',
        normalizedName: 'hogar',
        giftIds: ['gift-1', 'gift-2'],
        gifts: [
          { id: 'gift-1', categoryId: 'category-1' },
          { id: 'gift-2', categoryId: 'category-2' },
        ],
        eventTypeIds: ['wedding'],
        eventTypes: [{ id: 'wedding', name: 'Casamiento' }],
      },
    ])
  })
})
