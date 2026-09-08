import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventFindMany: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    event: {
      findMany: mocks.eventFindMany,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getAllEventsForAdmin } from '@/actions/data/event'

describe('admin event listing', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.eventFindMany.mockResolvedValue([])
  })

  it('does not expose events to a non-admin', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'organizer-1',
      role: 'ORGANIZER',
    })

    await expect(getAllEventsForAdmin()).resolves.toEqual([])
    expect(mocks.eventFindMany).not.toHaveBeenCalled()
  })

  it('returns the fields needed by the staff event table newest first', async () => {
    const events = [{ id: 'event-1' }]
    mocks.eventFindMany.mockResolvedValue(events)

    await expect(getAllEventsForAdmin()).resolves.toBe(events)
    expect(mocks.eventFindMany).toHaveBeenCalledWith({
      select: {
        id: true,
        url: true,
        createdAt: true,
        date: true,
        eventType: { select: { id: true, name: true } },
        users: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            isPrimary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  })
})
