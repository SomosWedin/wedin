import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionFindMany: vi.fn(),
  payoutFindMany: vi.fn(),
  payoutCreate: vi.fn(),
  getCurrentUser: vi.fn(),
  getBankDetails: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    transaction: { findMany: mocks.transactionFindMany },
    payout: { findMany: mocks.payoutFindMany, create: mocks.payoutCreate },
  },
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/actions/data/bank-details', () => ({
  getBankDetails: mocks.getBankDetails,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getWalletSummary, requestPayout } from '@/actions/data/payout'

describe('wallet balance', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1' })
    mocks.getBankDetails.mockResolvedValue({ id: 'bank-1' })
    mocks.payoutCreate.mockResolvedValue({ id: 'payout-1' })
  })

  it('charges the service fee on gifts received, not on the remaining balance', async () => {
    mocks.transactionFindMany.mockResolvedValue([{ amount: '5000' }])
    mocks.payoutFindMany.mockResolvedValue([
      { amount: '1100', status: 'REQUESTED' },
    ])

    const summary = await getWalletSummary('event-1')

    expect(summary.totalReceived).toBe(5000)
    expect(summary.serviceFee).toBe(270)
    expect(summary.totalRequested).toBe(1100)
    expect(summary.balance).toBe(3630)
  })

  it('splits active payouts into in-transit and settled', async () => {
    mocks.transactionFindMany.mockResolvedValue([{ amount: '5000' }])
    mocks.payoutFindMany.mockResolvedValue([
      { amount: '1000', status: 'REQUESTED' },
      { amount: '100', status: 'PROCESSING' },
      { amount: '400', status: 'COMPLETED' },
    ])

    const summary = await getWalletSummary('event-1')

    expect(summary.inTransit).toBe(1100)
    expect(summary.settled).toBe(400)
  })

  it('nets only the service fee when no payout was requested, and excludes rejected ones from the query', async () => {
    mocks.transactionFindMany.mockResolvedValue([{ amount: '5000' }])
    mocks.payoutFindMany.mockResolvedValue([])

    const summary = await getWalletSummary('event-1')

    expect(summary.balance).toBe(4730)
    expect(mocks.payoutFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: 'event-1', status: { not: 'REJECTED' } },
      })
    )
  })

  it('rejects a payout above the balance the wallet screen shows', async () => {
    mocks.transactionFindMany.mockResolvedValue([{ amount: '5000' }])
    mocks.payoutFindMany.mockResolvedValue([
      { amount: '1100', status: 'REQUESTED' },
    ])

    const result = await requestPayout('event-1', { amount: '3631' })

    expect(result).toEqual({
      error: 'El monto solicitado supera tu saldo disponible.',
    })
    expect(mocks.payoutCreate).not.toHaveBeenCalled()
  })

  it('accepts a payout for the full displayed balance', async () => {
    mocks.transactionFindMany.mockResolvedValue([{ amount: '5000' }])
    mocks.payoutFindMany.mockResolvedValue([
      { amount: '1100', status: 'REQUESTED' },
    ])

    const result = await requestPayout('event-1', { amount: '3630' })

    expect(result).toEqual({ success: true })
    expect(mocks.payoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: '3630', eventId: 'event-1' }),
      })
    )
  })
})
