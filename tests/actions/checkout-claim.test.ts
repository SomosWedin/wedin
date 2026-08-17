import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  wishlistGiftFindMany: vi.fn(),
  transactionFindMany: vi.fn(),
  $transaction: vi.fn(),
  transactionCreate: vi.fn(),
  wishlistGiftUpdateMany: vi.fn(),
  applyTransactionStatusChange: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    wishlistGift: { findMany: mocks.wishlistGiftFindMany },
    transaction: { findMany: mocks.transactionFindMany },
    $transaction: mocks.$transaction,
  },
}))

vi.mock('@/actions/data/transaction', () => ({
  applyTransactionStatusChange: mocks.applyTransactionStatusChange,
}))

import { type CheckoutCartItem, createTransactionsForCart } from '@/actions/data/checkout'

const payer = {
  payerName: 'Juan Perez',
  payerPhone: '0981123456',
  paymentMethod: 'BANK_TRANSFER' as const,
}

let transactionIdCounter = 0

function individualGift(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wg-individual',
    isGroupGift: false,
    quantity: 5,
    gift: { name: 'Silla', price: '100000' },
    transactions: [],
    ...overrides,
  }
}

function groupGift(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wg-group',
    isGroupGift: true,
    quantity: 1,
    gift: { name: 'Luna de miel', price: '1000000' },
    transactions: [],
    ...overrides,
  }
}

function cartItem(overrides: Partial<CheckoutCartItem> = {}): CheckoutCartItem {
  return { wishlistGiftId: 'wg-individual', amount: '100000', quantity: 1, ...overrides }
}

describe('createTransactionsForCart guardrails', () => {
  beforeEach(() => {
    transactionIdCounter = 0
    mocks.transactionFindMany.mockResolvedValue([]) // no stale CARD holds by default
    mocks.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        transaction: { create: mocks.transactionCreate },
        wishlistGift: { updateMany: mocks.wishlistGiftUpdateMany },
      })
    )
    mocks.transactionCreate.mockImplementation(async () => ({
      id: `tx${++transactionIdCounter}`,
    }))
  })

  it('rejects an empty cart without touching the database', async () => {
    const result = await createTransactionsForCart('event1', payer, [])

    expect(result).toEqual({ error: 'Tu carrito está vacío.' })
    expect(mocks.wishlistGiftFindMany).not.toHaveBeenCalled()
  })

  it('rejects invalid payer data without touching the database', async () => {
    const result = await createTransactionsForCart(
      'event1',
      { ...payer, payerPhone: 'not-digits' },
      [cartItem()]
    )

    expect(result).toHaveProperty('error')
    expect(mocks.wishlistGiftFindMany).not.toHaveBeenCalled()
  })

  it('rejects a gift that no longer matches the event/availability filters', async () => {
    mocks.wishlistGiftFindMany.mockResolvedValue([])

    const result = await createTransactionsForCart('event1', payer, [cartItem()])

    expect(result).toEqual({ error: 'Uno de los regalos ya no está disponible.' })
    expect(mocks.$transaction).not.toHaveBeenCalled()
  })

  describe('individual gifts', () => {
    it('rejects buying more units than remain (pre-validation)', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([
        individualGift({ quantity: 3, transactions: [{ status: 'COMPLETED', quantity: 3 }] }),
      ])

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ quantity: 1, amount: '100000' }),
      ])

      expect(result).toEqual({ error: '"Silla" ya no está disponible.' })
      expect(mocks.$transaction).not.toHaveBeenCalled()
    })

    it('rejects a quantity that exceeds what remains, even by one unit', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([
        individualGift({ quantity: 5, transactions: [{ status: 'COMPLETED', quantity: 3 }] }),
      ])

      // 2 units remain (5 - 3); asking for 3 must fail.
      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ quantity: 3, amount: '300000' }),
      ])

      expect(result).toEqual({ error: '"Silla" ya no está disponible.' })
      expect(mocks.$transaction).not.toHaveBeenCalled()
    })

    it('allows a quantity exactly at the remaining stock boundary', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([
        individualGift({ quantity: 5, transactions: [{ status: 'COMPLETED', quantity: 3 }] }),
      ])
      mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })
      mocks.transactionFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ quantity: 2, amount: '200000' }),
      ])

      expect(result).toHaveProperty('success')
      expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
        where: { id: 'wg-individual', isGroupGift: false, reservedQuantity: { lte: 3 } },
        data: { reservedQuantity: { increment: 2 } },
      })
    })

    it('rejects an amount that does not match price x quantity', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([individualGift({ quantity: 5 })])

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ quantity: 2, amount: '150000' }), // should be 200000
      ])

      expect(result).toEqual({ error: '"Silla" ya no está disponible.' })
      expect(mocks.$transaction).not.toHaveBeenCalled()
    })

    it('rejects a zero or negative quantity', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([individualGift({ quantity: 5 })])

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ quantity: 0, amount: '0' }),
      ])

      expect(result).toEqual({ error: '"Silla" ya no está disponible.' })
      expect(mocks.$transaction).not.toHaveBeenCalled()
    })

    it('rejects the same gift added twice in one cart', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([individualGift({ quantity: 5 })])

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ quantity: 1, amount: '100000' }),
        cartItem({ quantity: 1, amount: '100000' }),
      ])

      expect(result).toEqual({
        error: 'Agregaste "Silla" más de una vez a tu carrito.',
      })
      expect(mocks.$transaction).not.toHaveBeenCalled()
    })

    it('rejects the claim when a concurrent guest already consumed the remaining stock', async () => {
      // Pre-validation is racy by design (COMPLETED-only) and passes here;
      // the atomic claim is the real guarantee and must catch the race.
      mocks.wishlistGiftFindMany.mockResolvedValue([individualGift({ quantity: 5 })])
      mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ quantity: 1, amount: '100000' }),
      ])

      expect(result).toEqual({
        error: '"Silla" ya no está disponible — alguien más lo reservó recién.',
      })
    })

    it('rolls back earlier successful claims in the same cart when a later one loses the race', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([
        individualGift({ id: 'wg-a', gift: { name: 'Silla', price: '100000' }, quantity: 5 }),
        individualGift({ id: 'wg-b', gift: { name: 'Mesa', price: '100000' }, quantity: 5 }),
      ])
      // First item's claim succeeds, second item's claim loses the race.
      mocks.wishlistGiftUpdateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 })

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ wishlistGiftId: 'wg-a', quantity: 1, amount: '100000' }),
        cartItem({ wishlistGiftId: 'wg-b', quantity: 1, amount: '100000' }),
      ])

      expect(result).toEqual({
        error: '"Mesa" ya no está disponible — alguien más lo reservó recién.',
      })
      // Only the first (successfully claimed) transaction gets released —
      // the second was rolled back inside its own failed $transaction call.
      expect(mocks.applyTransactionStatusChange).toHaveBeenCalledTimes(1)
      expect(mocks.applyTransactionStatusChange).toHaveBeenCalledWith('tx1', 'FAILED', null)
    })
  })

  describe('group gifts', () => {
    it('rejects a non-positive contribution', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([groupGift()])

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ wishlistGiftId: 'wg-group', quantity: 1, amount: '0' }),
      ])

      expect(result).toEqual({ error: 'El monto ingresado no es válido para este regalo.' })
      expect(mocks.$transaction).not.toHaveBeenCalled()
    })

    it('rejects a contribution larger than what remains', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([
        groupGift({
          gift: { name: 'Luna de miel', price: '1000000' },
          transactions: [{ status: 'COMPLETED', amount: '800000', quantity: 1 }],
        }),
      ])

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ wishlistGiftId: 'wg-group', quantity: 1, amount: '300000' }), // only 200000 left
      ])

      expect(result).toEqual({ error: 'El monto ingresado no es válido para este regalo.' })
      expect(mocks.$transaction).not.toHaveBeenCalled()
    })

    it('allows a contribution exactly equal to what remains', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([
        groupGift({
          gift: { name: 'Luna de miel', price: '1000000' },
          transactions: [{ status: 'COMPLETED', amount: '800000', quantity: 1 }],
        }),
      ])
      mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ wishlistGiftId: 'wg-group', quantity: 1, amount: '200000' }),
      ])

      expect(result).toHaveProperty('success')
      expect(mocks.wishlistGiftUpdateMany).toHaveBeenCalledWith({
        where: { id: 'wg-group', isGroupGift: true, reservedAmount: { lte: 800000 } },
        data: { reservedAmount: { increment: 200000 } },
      })
    })

    it('rejects the claim when a concurrent contribution already filled the gift', async () => {
      mocks.wishlistGiftFindMany.mockResolvedValue([groupGift()])
      mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 0 })

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ wishlistGiftId: 'wg-group', quantity: 1, amount: '500000' }),
      ])

      expect(result).toEqual({
        error: '"Luna de miel" ya no está disponible — alguien más lo reservó recién.',
      })
    })

    it('does not block adding the same group gift twice in one cart', async () => {
      // Unlike individual gifts, two separate contributions to the same
      // group gift in one checkout are allowed by design.
      mocks.wishlistGiftFindMany.mockResolvedValue([groupGift({ quantity: 1 })])
      mocks.wishlistGiftUpdateMany.mockResolvedValue({ count: 1 })

      const result = await createTransactionsForCart('event1', payer, [
        cartItem({ wishlistGiftId: 'wg-group', quantity: 1, amount: '100000' }),
        cartItem({ wishlistGiftId: 'wg-group', quantity: 1, amount: '100000' }),
      ])

      expect(result).toHaveProperty('success')
      expect(mocks.$transaction).toHaveBeenCalledTimes(2)
    })
  })
})
