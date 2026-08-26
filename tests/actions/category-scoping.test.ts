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
  { id: 'c1', name: 'Luna de miel', eventType: 'WEDDING', sortOrder: 1 },
  { id: 'c2', name: 'Cama y cocina', eventType: 'WEDDING', sortOrder: 3 },
]

const allCategories = [
  ...weddingCategories,
  { id: 'c3', name: 'Baby shower', eventType: 'OTHER', sortOrder: 6 },
]

describe('category scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftlistFindMany.mockResolvedValue([])
  })

  it('scopes gifts to the categories of the event type', async () => {
    mocks.categoryFindMany.mockResolvedValue(allCategories)

    await getGifts({ searchParams: {}, eventType: 'WEDDING' })

    expect(mocks.giftFindMany.mock.calls[0][0].where.categoryId).toEqual({
      in: ['c1', 'c2'],
    })
  })

  it('narrows to a single category when one is selected', async () => {
    mocks.categoryFindMany.mockResolvedValue(allCategories)

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

  it('ignores a category filter outside the event type instead of emptying', async () => {
    mocks.categoryFindMany.mockResolvedValue(allCategories)

    await getGifts({ searchParams: { category: 'c3' }, eventType: 'WEDDING' })

    expect(mocks.giftFindMany.mock.calls[0][0].where.categoryId).toEqual({
      in: ['c1', 'c2'],
    })
  })

  it('does not scope when any category is still untagged', async () => {
    mocks.categoryFindMany.mockResolvedValue([
      ...allCategories,
      { id: 'c9', name: 'Casa', eventType: null, sortOrder: 0 },
    ])

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
    const otherOnly = [allCategories[2]]
    mocks.categoryFindMany.mockResolvedValue(otherOnly)

    await expect(getCategories('WEDDING')).resolves.toEqual(otherOnly)
  })

  it('returns only the matching categories when the event type matches', async () => {
    mocks.categoryFindMany.mockResolvedValue(allCategories)

    await expect(getCategories('WEDDING')).resolves.toEqual(weddingCategories)
  })

  it('returns every category when called with no event type', async () => {
    mocks.categoryFindMany.mockResolvedValue(allCategories)

    await expect(getCategories()).resolves.toEqual(allCategories)
  })

  it('returns an empty list when categories cannot be read at all', async () => {
    mocks.categoryFindMany.mockRejectedValue(new Error('stale client'))

    await expect(getCategories('WEDDING')).resolves.toEqual([])
  })
})
