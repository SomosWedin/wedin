import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventFindFirst: vi.fn(),
  eventUpdate: vi.fn(),
  revalidatePath: vi.fn(),
  getTermsFileVersion: vi.fn(),
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

vi.mock('@/lib/server/terms-storage', () => ({
  getTermsFileVersion: mocks.getTermsFileVersion,
}))

import { setEventPublished } from '@/actions/data/event'

describe('organizer terms acceptance', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.eventUpdate.mockResolvedValue({ id: 'event-1', url: 'mi-evento' })
    mocks.getTermsFileVersion.mockResolvedValue(
      '951636ae27bca39c302c283c81f58b6c'
    )
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
    expect(data.termsVersion).toBe('951636ae27bca39c302c283c81f58b6c')
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
    expect(mocks.getTermsFileVersion).not.toHaveBeenCalled()
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
    expect(mocks.getTermsFileVersion).not.toHaveBeenCalled()
  })

  it('still activates the list when the document fingerprint is unavailable', async () => {
    mocks.eventFindFirst.mockResolvedValue({
      id: 'event-1',
      termsAcceptedAt: null,
    })
    mocks.getTermsFileVersion.mockResolvedValue(null)

    const result = await setEventPublished('event-1', true)

    const { data } = mocks.eventUpdate.mock.calls[0][0]

    expect(data.isPublished).toBe(true)
    expect(data.termsAcceptedAt).toBeInstanceOf(Date)
    expect(data.termsVersion).toBeNull()
    expect(result).toEqual({
      success: expect.objectContaining({ id: 'event-1' }),
    })
  })
})
