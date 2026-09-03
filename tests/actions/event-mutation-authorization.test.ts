import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventFindFirst: vi.fn(),
  eventFindUnique: vi.fn(),
  eventUpdate: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    event: {
      findFirst: mocks.eventFindFirst,
      findUnique: mocks.eventFindUnique,
      update: mocks.eventUpdate,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  setEventPublished,
  updateEvent,
  updateEventUrl,
} from '@/actions/data/event'

describe('event mutation authorization', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.eventFindFirst.mockResolvedValue(null)
    mocks.eventFindUnique.mockResolvedValue(null)
    mocks.eventUpdate.mockResolvedValue({
      id: 'event-1',
      url: 'mi-evento',
      isPublished: true,
    })
  })

  it.each([
    ['details', () => updateEvent('event-1', { coverMessage: 'Hola' })],
    ['url', () => updateEventUrl('event-1', 'mi-evento')],
    ['published status', () => setEventPublished('event-1', true)],
  ])(
    'rejects a %s mutation when the user does not own the event',
    async (_, mutate) => {
      const result = await mutate()

      expect(result).toEqual({ error: 'No autorizado.' })
      expect(mocks.eventUpdate).not.toHaveBeenCalled()
    }
  )

  it('stops before reading an event when the user is unauthenticated', async () => {
    mocks.getCurrentUser.mockResolvedValue(null)

    const result = await updateEvent('event-1', { coverMessage: 'Hola' })

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.eventFindFirst).not.toHaveBeenCalled()
    expect(mocks.eventUpdate).not.toHaveBeenCalled()
  })

  it('does not expose URL availability before event ownership is verified', async () => {
    const result = await updateEventUrl('event-1', 'mi-evento')

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.eventFindUnique).not.toHaveBeenCalled()
  })

  it('updates an event after verifying membership', async () => {
    mocks.eventFindFirst.mockResolvedValue({ id: 'event-1' })

    const result = await updateEvent('event-1', { coverMessage: 'Hola' })

    expect(mocks.eventFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'event-1',
        users: { some: { id: 'user-1' } },
      },
      select: { id: true, termsAcceptedAt: true },
    })
    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { coverMessage: 'Hola' },
    })
    expect(result).toEqual({
      success: expect.objectContaining({ id: 'event-1' }),
    })
  })
})
