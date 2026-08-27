import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  wishlistGiftFindUnique: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.$transaction,
    gift: {
      create: mocks.giftCreate,
    },
    wishlistGift: {
      findUnique: mocks.wishlistGiftFindUnique,
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

import { createGift, editGift } from '@/actions/data/gift'

const baseFormData = {
  name: 'Silla',
  categoryId: 'cat1',
  price: '150000',
  imageUrl: '',
  isDefault: false,
  eventId: 'e1',
  wishlistId: 'w1',
  isFavoriteGift: false,
  isGroupGift: false,
  quantity: 1,
}

const PRICE_LOCKED_ERROR =
  'No se puede cambiar el precio de un regalo individual con unidades reservadas o vendidas.'

describe('editGift price lock', () => {
  beforeEach(() => {
    mocks.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          gift: { update: mocks.giftUpdate },
          wishlistGift: { findUnique: mocks.wishlistGiftFindUnique },
        })
    )
  })

  it('allows any edit when the price is not changing', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '150000' },
      isGroupGift: false,
      reservedQuantity: 1,
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
  })

  it('blocks a price change on an individual gift with an active claim', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: false,
      reservedQuantity: 1,
    })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('allows a price change on an individual gift with no claims yet', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: false,
      reservedQuantity: 0,
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
  })

  it('allows a price change on a group gift regardless of contributions', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: true,
      reservedQuantity: 0, // group gifts never touch reservedQuantity
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
  })
})

describe('createGift price lock (customized copy path)', () => {
  beforeEach(() => {
    mocks.giftCreate.mockResolvedValue({ id: 'g2' })
  })

  it('skips the lock entirely for a genuinely new registry entry (no wishlistGiftId)', async () => {
    const result = await createGift({
      ...baseFormData,
      isDefault: false,
      eventId: 'e1',
    })

    expect(result).toEqual({ giftId: 'g2' })
    expect(mocks.wishlistGiftFindUnique).not.toHaveBeenCalled()
  })

  it('blocks creating a customized copy with a new price while claimed', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '100000' },
      isGroupGift: false,
      reservedQuantity: 2,
    })

    const result = await createGift(
      {
        ...baseFormData,
        isDefault: false,
        eventId: 'e1',
      },
      'wg1'
    )

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('allows creating a customized copy with the same price regardless of claims', async () => {
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      gift: { price: '150000' },
      isGroupGift: false,
      reservedQuantity: 2,
    })

    const result = await createGift(
      {
        ...baseFormData,
        isDefault: false,
        eventId: 'e1',
      },
      'wg1'
    )

    expect(result).toEqual({ giftId: 'g2' })
    expect(mocks.wishlistGiftFindUnique).toHaveBeenCalledOnce()
  })
})
