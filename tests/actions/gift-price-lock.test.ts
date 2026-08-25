import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  giftFindUnique: vi.fn(),
  giftUpdate: vi.fn(),
  giftCreate: vi.fn(),
  wishlistGiftFindUnique: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.$transaction,
    gift: {
      findUnique: mocks.giftFindUnique,
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
  isEditedVersion: false,
  sourceGiftId: '',
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
          gift: { findUnique: mocks.giftFindUnique, update: mocks.giftUpdate },
          wishlistGift: { findUnique: mocks.wishlistGiftFindUnique },
        })
    )
  })

  it('allows any edit when the price is not changing', async () => {
    mocks.giftFindUnique.mockResolvedValue({ price: '150000' })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
    expect(mocks.wishlistGiftFindUnique).not.toHaveBeenCalled()
  })

  it('blocks a price change on an individual gift with an active claim', async () => {
    mocks.giftFindUnique.mockResolvedValue({ price: '100000' })
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      isGroupGift: false,
      reservedQuantity: 1,
    })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftUpdate).not.toHaveBeenCalled()
  })

  it('allows a price change on an individual gift with no claims yet', async () => {
    mocks.giftFindUnique.mockResolvedValue({ price: '100000' })
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      isGroupGift: false,
      reservedQuantity: 0,
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
  })

  it('allows a price change on a group gift regardless of contributions', async () => {
    mocks.giftFindUnique.mockResolvedValue({ price: '100000' })
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      isGroupGift: true,
      reservedQuantity: 0, // group gifts never touch reservedQuantity
    })
    mocks.giftUpdate.mockResolvedValue({ id: 'g1' })

    const result = await editGift(baseFormData, 'g1', 'wg1')

    expect(result).toEqual({ giftId: 'g1' })
  })
})

describe('createGift price lock (edited-version-of-existing-gift path)', () => {
  beforeEach(() => {
    mocks.giftCreate.mockResolvedValue({ id: 'g2' })
  })

  it('skips the lock entirely for a genuinely new registry entry (no wishlistGiftId)', async () => {
    mocks.giftFindUnique.mockResolvedValue({ price: '999999' }) // would be locked if checked

    const result = await createGift({
      ...baseFormData,
      isDefault: false,
      isEditedVersion: false,
      sourceGiftId: '',
      eventId: 'e1',
    })

    expect(result).toEqual({ giftId: 'g2' })
    expect(mocks.wishlistGiftFindUnique).not.toHaveBeenCalled()
  })

  it('blocks creating an edited-version copy with a new price while claimed', async () => {
    mocks.giftFindUnique.mockResolvedValue({ price: '100000' })
    mocks.wishlistGiftFindUnique.mockResolvedValue({
      isGroupGift: false,
      reservedQuantity: 2,
    })

    const result = await createGift(
      {
        ...baseFormData,
        isDefault: false,
        isEditedVersion: true,
        sourceGiftId: 'source-g1',
        eventId: 'e1',
      },
      'wg1'
    )

    expect(result).toEqual({ error: PRICE_LOCKED_ERROR })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('allows creating an edited-version copy with the same price regardless of claims', async () => {
    mocks.giftFindUnique.mockResolvedValue({ price: '150000' }) // same as baseFormData.price

    const result = await createGift(
      {
        ...baseFormData,
        isDefault: false,
        isEditedVersion: true,
        sourceGiftId: 'source-g1',
        eventId: 'e1',
      },
      'wg1'
    )

    expect(result).toEqual({ giftId: 'g2' })
    expect(mocks.wishlistGiftFindUnique).not.toHaveBeenCalled()
  })
})
