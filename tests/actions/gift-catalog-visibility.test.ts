import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    gift: {
      findMany: mocks.findMany,
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

import { getGifts } from '@/actions/data/gift'

describe('gift catalog visibility', () => {
  beforeEach(() => {
    mocks.findMany.mockResolvedValue([])
  })

  it('only queries default gifts for the /gifts catalog', async () => {
    await getGifts({ searchParams: {} })

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDefault: true },
      })
    )
  })
})
