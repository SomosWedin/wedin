import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock('@/prisma/client', () => ({
  default: { category: { findMany: mocks.findMany } },
}))

vi.mock('@/actions/get-current-user', () => ({ getCurrentUser: vi.fn() }))

import { getCategories } from '@/actions/data/category'

describe('category catalog visibility', () => {
  it('does not expose unassigned categories in an organizer event catalog', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'wedding',
        name: 'Hogar',
        eventTypeIds: ['event-type-wedding'],
        eventTypes: [],
      },
      {
        id: 'unassigned',
        name: 'Pendiente',
        eventTypeIds: [],
        eventTypes: [],
      },
    ])

    const result = await getCategories('event-type-wedding')

    expect(result.map(category => category.id)).toEqual(['wedding'])
  })
})
