import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getEventByUrl: vi.fn(),
  createOrder: vi.fn(),
  applyTransactionStatusChange: vi.fn(),
  transactionFindMany: vi.fn(),
}))

vi.mock('@/actions/data/public-event', () => ({
  getEventByUrl: mocks.getEventByUrl,
}))

vi.mock('@/lib/pagopar', () => ({ createOrder: mocks.createOrder }))

vi.mock('@/actions/data/transaction', () => ({
  applyTransactionStatusChange: mocks.applyTransactionStatusChange,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    transaction: { findMany: mocks.transactionFindMany },
  },
}))

import { createPagoparCheckoutSession } from '@/actions/data/checkout'

describe('createPagoparCheckoutSession availability', () => {
  beforeEach(() => {
    mocks.transactionFindMany.mockResolvedValue([])
  })

  it('refuses to open a payment session for a delisted event', async () => {
    mocks.getEventByUrl.mockResolvedValue({
      id: 'event-1',
      isPublished: false,
    })

    const result = await createPagoparCheckoutSession('mi-evento', ['tx-1'])

    expect(result).toEqual({
      error: 'Esta lista de regalos no está disponible.',
    })
    expect(mocks.createOrder).not.toHaveBeenCalled()
  })

  it('releases the stock held by the abandoned transactions', async () => {
    mocks.getEventByUrl.mockResolvedValue({
      id: 'event-1',
      isPublished: false,
    })

    await createPagoparCheckoutSession('mi-evento', ['tx-1', 'tx-2'])

    expect(mocks.applyTransactionStatusChange).toHaveBeenCalledWith(
      'tx-1',
      'FAILED',
      null
    )
    expect(mocks.applyTransactionStatusChange).toHaveBeenCalledWith(
      'tx-2',
      'FAILED',
      null
    )
  })

  it('lets a published event through to the transaction lookup', async () => {
    mocks.getEventByUrl.mockResolvedValue({ id: 'event-1', isPublished: true })

    await createPagoparCheckoutSession('mi-evento', ['tx-1'])

    expect(mocks.transactionFindMany).toHaveBeenCalled()
  })
})
