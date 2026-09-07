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

const giftlist = (name: string, prices: string[]) => ({
  id: name,
  name,
  gifts: prices.map((price, index) => ({
    id: `${name}-${index}`,
    price,
    category: { eventTypeIds: ['event-type-1'] },
  })),
})

const names = (result: { name: string }[]) => result.map(entry => entry.name)

describe('collection sorting', () => {
  beforeEach(() => {
    mocks.findMany.mockResolvedValue([
      giftlist('caro', ['30000000', '21055000']),
      giftlist('barato', ['2196000']),
      giftlist('medio', ['9675000', '5490000']),
    ])
  })

  it('sorts collections by their total price, low to high', async () => {
    const result = await getGiftlists({ searchParams: { sort: 'price-asc' } })

    expect(names(result)).toEqual(['barato', 'medio', 'caro'])
  })

  it('sorts collections by their total price, high to low', async () => {
    const result = await getGiftlists({ searchParams: { sort: 'price-desc' } })

    expect(names(result)).toEqual(['caro', 'medio', 'barato'])
  })

  it('keeps the database order when no sort is requested', async () => {
    const result = await getGiftlists({ searchParams: {} })

    expect(names(result)).toEqual(['caro', 'barato', 'medio'])
  })

  it('sorts on the summed total, not on any single gift price', async () => {
    mocks.findMany.mockResolvedValue([
      giftlist('un-regalo-caro', ['20000000']),
      giftlist('muchos-regalos-baratos', ['9000000', '9000000', '9000000']),
    ])

    const result = await getGiftlists({ searchParams: { sort: 'price-asc' } })

    expect(names(result)).toEqual(['un-regalo-caro', 'muchos-regalos-baratos'])
  })

  it('compares totals numerically rather than as strings', async () => {
    mocks.findMany.mockResolvedValue([
      giftlist('nueve-millones', ['9000000']),
      giftlist('diez-millones', ['10000000']),
    ])

    const result = await getGiftlists({ searchParams: { sort: 'price-asc' } })

    expect(names(result)).toEqual(['nueve-millones', 'diez-millones'])
  })

  it('still sorts once collections are scoped to an event type', async () => {
    const result = await getGiftlists({
      searchParams: { sort: 'price-asc' },
      eventTypeId: 'event-type-1',
    })

    expect(names(result)).toEqual(['barato', 'medio', 'caro'])
  })
})
