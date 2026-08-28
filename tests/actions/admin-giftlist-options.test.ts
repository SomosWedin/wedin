import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  giftlistFindMany: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    giftlist: { findMany: mocks.giftlistFindMany },
  },
}))

import { getGiftlistOptionsForAdmin } from '@/actions/data/giftlist'

describe('admin gift list options', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'giftlist-1', name: 'Hogar' },
    ])
  })

  it('returns lightweight collection options for admins', async () => {
    const result = await getGiftlistOptionsForAdmin()

    expect(mocks.giftlistFindMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    expect(result).toEqual([{ id: 'giftlist-1', name: 'Hogar' }])
  })

  it('rejects non-admin callers before querying collections', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'organizer-1',
      role: 'ORGANIZER',
    })

    const result = await getGiftlistOptionsForAdmin()

    expect(result).toEqual([])
    expect(mocks.giftlistFindMany).not.toHaveBeenCalled()
  })
})
