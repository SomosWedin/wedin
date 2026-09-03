import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  categoryFindMany: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    gift: {
      findMany: mocks.findMany,
    },
    category: { findMany: mocks.categoryFindMany },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}))

import { getGifts } from '@/actions/data/gift'

describe('gift catalog visibility', () => {
  beforeEach(() => {
    mocks.findMany.mockResolvedValue([])
    mocks.categoryFindMany.mockResolvedValue([])
  })

  it('only queries default gifts for the /gifts catalog', async () => {
    await getGifts({ searchParams: {} })

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDefault: true },
      })
    )
  })

  it('returns no gifts when an event type has no compatible categories', async () => {
    const result = await getGifts({
      searchParams: {},
      eventTypeId: 'event-type-wedding',
    })

    expect(result).toEqual([])
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it('filters gifts that belong to the requested collection', async () => {
    await getGifts({ searchParams: { giftlistId: 'giftlist-1' } })

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDefault: true,
          giftlistIds: { has: 'giftlist-1' },
        },
      })
    )
  })
})
