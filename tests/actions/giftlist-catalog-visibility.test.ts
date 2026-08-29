import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    giftlist: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
    },
  },
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}))

import { getGiftlist, getGiftlists } from '@/actions/data/giftlist'

describe('giftlist catalog visibility', () => {
  beforeEach(() => {
    mocks.findMany.mockResolvedValue([])
  })

  it('filters collections through the categories of their gifts', async () => {
    await getGiftlists({ searchParams: { category: 'category-1' } })

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        gifts: { some: { categoryId: 'category-1' } },
      },
      include: {
        gifts: { include: { image: true } },
        eventTypes: { select: { id: true, name: true } },
      },
    })
  })

  it('includes only collections assigned to the event type', async () => {
    await getGiftlists({ eventTypeId: 'event-type-wedding' })

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        eventTypeIds: { has: 'event-type-wedding' },
      },
      include: {
        gifts: { include: { image: true } },
        eventTypes: { select: { id: true, name: true } },
      },
    })
  })

  it('scopes direct collection URLs to the organizer event type', async () => {
    mocks.findFirst.mockResolvedValue(null)

    await getGiftlist('giftlist-1', 'event-type-wedding')

    expect(mocks.findFirst).toHaveBeenCalledWith({
      include: {
        gifts: { include: { image: true } },
        eventTypes: { select: { id: true, name: true } },
      },
      where: {
        id: 'giftlist-1',
        eventTypeIds: { has: 'event-type-wedding' },
      },
    })
  })
})
