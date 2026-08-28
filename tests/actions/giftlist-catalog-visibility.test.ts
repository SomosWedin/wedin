import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    giftlist: {
      findMany: mocks.findMany,
    },
  },
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}))

import { getGiftlists } from '@/actions/data/giftlist'

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
      },
    })
  })
})
