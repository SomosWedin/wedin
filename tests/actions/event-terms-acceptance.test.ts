import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventFindFirst: vi.fn(),
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
      findUnique: vi.fn(),
      update: mocks.eventUpdate,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { setEventPublished } from '@/actions/data/event'

describe('organizer terms acceptance', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.eventUpdate.mockResolvedValue({ id: 'event-1', url: 'mi-evento' })
  })

  it('stamps the accepted document when the list is first activated', async () => {
    mocks.eventFindFirst.mockResolvedValue({
      id: 'event-1',
      termsAcceptedAt: null,
    })

    await setEventPublished('event-1', true)

    const { data } = mocks.eventUpdate.mock.calls[0][0]

    expect(data.isPublished).toBe(true)
    expect(data.termsAcceptedAt).toBeInstanceOf(Date)
  })

  it('does not overwrite an acceptance that already exists', async () => {
    mocks.eventFindFirst.mockResolvedValue({
      id: 'event-1',
      termsAcceptedAt: new Date('2026-08-30T00:00:00Z'),
    })

    await setEventPublished('event-1', true)

    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { isPublished: true },
    })
  })

  it('does not record an acceptance when the site is being hidden', async () => {
    mocks.eventFindFirst.mockResolvedValue({
      id: 'event-1',
      termsAcceptedAt: null,
    })

    await setEventPublished('event-1', false)

    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { isPublished: false },
    })
  })

  it('records the acceptance only once across an activation cycle', async () => {
    mocks.eventFindFirst.mockResolvedValueOnce({
      id: 'event-1',
      termsAcceptedAt: null,
    })

    await setEventPublished('event-1', true)

    const firstStamp = mocks.eventUpdate.mock.calls[0][0].data.termsAcceptedAt

    mocks.eventFindFirst.mockResolvedValueOnce({
      id: 'event-1',
      termsAcceptedAt: firstStamp,
    })

    await setEventPublished('event-1', false)

    expect(mocks.eventUpdate.mock.calls[1][0].data).toEqual({
      isPublished: false,
    })
  })
})
