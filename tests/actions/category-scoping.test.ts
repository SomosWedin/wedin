import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  giftFindMany: vi.fn(),
  giftlistFindMany: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    category: { findMany: mocks.categoryFindMany },
    gift: { findMany: mocks.giftFindMany },
    giftlist: { findMany: mocks.giftlistFindMany },
  },
}))

import { getCategories } from '@/actions/data/category'
import { getGifts } from '@/actions/data/gift'
import { getGiftlists } from '@/actions/data/giftlist'

const weddingCategories = [
  { id: 'c1', name: 'Luna de miel', eventTypes: ['WEDDING'], sortOrder: 1 },
  { id: 'c2', name: 'Cama y cocina', eventTypes: ['WEDDING'], sortOrder: 3 },
]

describe('category scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftlistFindMany.mockResolvedValue([])
  })

  it('scopes gifts to the categories of the event type', async () => {
    mocks.categoryFindMany.mockResolvedValue(weddingCategories)

    await getGifts({ searchParams: {}, eventType: 'WEDDING' })

    expect(mocks.giftFindMany.mock.calls[0][0].where.categoryId).toEqual({
      in: ['c1', 'c2'],
    })
  })

  it('narrows to a single category when one is selected', async () => {
    mocks.categoryFindMany.mockResolvedValue(weddingCategories)

    await getGifts({ searchParams: { category: 'c2' }, eventType: 'WEDDING' })

    expect(mocks.giftFindMany.mock.calls[0][0].where.categoryId).toEqual({
      in: ['c2'],
    })
  })

  it('does not scope gifts when the category read fails', async () => {
    mocks.categoryFindMany.mockRejectedValue(new Error('stale client'))

    await getGifts({ searchParams: {}, eventType: 'WEDDING' })

    expect(mocks.giftFindMany.mock.calls[0][0].where.categoryId).toBeUndefined()
  })

  it('does not scope gifts when no category matches the event type', async () => {
    mocks.categoryFindMany.mockResolvedValue([])

    await getGifts({ searchParams: {}, eventType: 'WEDDING' })

    expect(mocks.giftFindMany.mock.calls[0][0].where.categoryId).toBeUndefined()
  })

  it('does not scope giftlists when the category read fails', async () => {
    mocks.categoryFindMany.mockRejectedValue(new Error('stale client'))

    await getGiftlists({ searchParams: {}, eventType: 'WEDDING' })

    expect(
      mocks.giftlistFindMany.mock.calls[0][0].where.categoryId
    ).toBeUndefined()
  })

  it('falls back to every category when the event type matches none', async () => {
    mocks.categoryFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(weddingCategories)

    await expect(getCategories('WEDDING')).resolves.toEqual(weddingCategories)
  })

  it('returns an empty list when categories cannot be read at all', async () => {
    mocks.categoryFindMany.mockRejectedValue(new Error('stale client'))

    await expect(getCategories('WEDDING')).resolves.toEqual([])
  })
})
