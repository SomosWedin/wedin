import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  revalidatePath: vi.fn(),
  recomputeWishlistGiftProgress: vi.fn(),
}))

vi.mock('@/prisma/client', () => ({
  default: {
    wishlistGift: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/actions/data/transaction', () => ({
  recomputeWishlistGiftProgress: mocks.recomputeWishlistGiftProgress,
}))

import { editWishlistGift } from '@/actions/data/wishlist-gift'

const baseInput = {
  wishlistGiftId: 'wg1',
  wishlistId: 'w1',
  giftId: 'g1',
  isFavoriteGift: false,
}

describe('editWishlistGift guardrails', () => {
  beforeEach(() => {
    mocks.recomputeWishlistGiftProgress.mockResolvedValue(undefined)
  })

  it('rejects invalid input without touching the database', async () => {
    const result = await editWishlistGift({
      ...baseInput,
      wishlistGiftId: '',
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toHaveProperty('error')
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it('errors when the wishlist gift does not exist', async () => {
    mocks.findUnique.mockResolvedValue(null)

    const result = await editWishlistGift({
      ...baseInput,
      isGroupGift: false,
      quantity: 1,
    })

    expect(result).toEqual({ error: 'Regalo no encontrado.' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  describe('individual gift, staying individual', () => {
    beforeEach(() => {
      mocks.findUnique.mockResolvedValue({ isGroupGift: false })
    })

    it('allows raising quantity above what is reserved', async () => {
      mocks.updateMany.mockResolvedValue({ count: 1 })

      const result = await editWishlistGift({
        ...baseInput,
        isGroupGift: false,
        quantity: 5,
      })

      expect(result).toEqual({ success: true })
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: 'wg1', reservedQuantity: { lte: 5 } },
        data: { giftId: 'g1', isFavoriteGift: false, isGroupGift: false, quantity: 5 },
      })
      expect(mocks.recomputeWishlistGiftProgress).toHaveBeenCalledWith('wg1')
    })

    it('rejects lowering quantity below units already reserved/sold', async () => {
      // The atomic guard is the one source of truth here — a lower quantity
      // than reservedQuantity never matches `reservedQuantity: { lte: quantity }`,
      // so the DB reports 0 rows updated regardless of what we send it.
      mocks.updateMany.mockResolvedValue({ count: 0 })

      const result = await editWishlistGift({
        ...baseInput,
        isGroupGift: false,
        quantity: 2,
      })

      expect(result).toEqual({
        error: 'La cantidad no puede ser menor a las unidades ya reservadas o vendidas.',
      })
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: 'wg1', reservedQuantity: { lte: 2 } },
        data: expect.objectContaining({ quantity: 2 }),
      })
      expect(mocks.recomputeWishlistGiftProgress).not.toHaveBeenCalled()
    })

    it('allows quantity exactly equal to what is reserved (boundary)', async () => {
      mocks.updateMany.mockResolvedValue({ count: 1 })

      const result = await editWishlistGift({
        ...baseInput,
        isGroupGift: false,
        quantity: 3,
      })

      expect(result).toEqual({ success: true })
    })

    it('always allows editing price-adjacent fields (name/category/image) with no quantity change', async () => {
      mocks.updateMany.mockResolvedValue({ count: 1 })

      const result = await editWishlistGift({
        ...baseInput,
        giftId: 'g2', // a price/name/category/image edit re-links to a new Gift row
        isGroupGift: false,
        quantity: 3,
      })

      expect(result).toEqual({ success: true })
      expect(mocks.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ giftId: 'g2' }) })
      )
    })
  })

  describe('switching individual -> group', () => {
    it('blocks the switch while the individual gift has an active claim', async () => {
      mocks.findUnique.mockResolvedValue({ isGroupGift: false })
      mocks.updateMany.mockResolvedValue({ count: 0 })

      const result = await editWishlistGift({
        ...baseInput,
        isGroupGift: true,
        quantity: 1,
      })

      expect(result).toEqual({
        error: 'No se puede cambiar el tipo de un regalo con contribuciones.',
      })
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: 'wg1', reservedQuantity: { lte: 0 }, reservedAmount: 0 },
        data: expect.objectContaining({ isGroupGift: true, quantity: 1 }),
      })
      expect(mocks.recomputeWishlistGiftProgress).not.toHaveBeenCalled()
    })

    it('allows the switch when the individual gift has no active claim', async () => {
      mocks.findUnique.mockResolvedValue({ isGroupGift: false })
      mocks.updateMany.mockResolvedValue({ count: 1 })

      const result = await editWishlistGift({
        ...baseInput,
        isGroupGift: true,
        quantity: 7, // ignored — group gifts always normalize to quantity 1
      })

      expect(result).toEqual({ success: true })
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: 'wg1', reservedQuantity: { lte: 0 }, reservedAmount: 0 },
        data: { giftId: 'g1', isFavoriteGift: false, isGroupGift: true, quantity: 1 },
      })
    })
  })

  describe('switching group -> individual', () => {
    it('blocks the switch while the group gift has contributions', async () => {
      mocks.findUnique.mockResolvedValue({ isGroupGift: true })
      mocks.updateMany.mockResolvedValue({ count: 0 })

      const result = await editWishlistGift({
        ...baseInput,
        isGroupGift: false,
        quantity: 1,
      })

      expect(result).toEqual({
        error: 'No se puede cambiar el tipo de un regalo con contribuciones.',
      })
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: 'wg1', reservedQuantity: { lte: 1 }, reservedAmount: 0 },
        data: expect.objectContaining({ isGroupGift: false }),
      })
    })

    it('allows the switch when the group gift has no contributions', async () => {
      mocks.findUnique.mockResolvedValue({ isGroupGift: true })
      mocks.updateMany.mockResolvedValue({ count: 1 })

      const result = await editWishlistGift({
        ...baseInput,
        isGroupGift: false,
        quantity: 4,
      })

      expect(result).toEqual({ success: true })
    })
  })

  describe('group gift, staying group', () => {
    beforeEach(() => {
      mocks.findUnique.mockResolvedValue({ isGroupGift: true })
    })

    it('always allows editing (e.g. price) regardless of existing contributions', async () => {
      mocks.updateMany.mockResolvedValue({ count: 1 })

      const result = await editWishlistGift({
        ...baseInput,
        giftId: 'g2',
        isGroupGift: true,
        quantity: 1,
      })

      expect(result).toEqual({ success: true })
      // No type change, so no reservedAmount guard — group gifts never touch
      // reservedQuantity either, so the floor is trivially satisfied.
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: 'wg1', reservedQuantity: { lte: 0 } },
        data: { giftId: 'g2', isFavoriteGift: false, isGroupGift: true, quantity: 1 },
      })
      expect(mocks.recomputeWishlistGiftProgress).toHaveBeenCalledWith('wg1')
    })

    it('recomputes progress so a stale "Recibido" badge cannot survive a price edit', async () => {
      mocks.updateMany.mockResolvedValue({ count: 1 })

      await editWishlistGift({
        ...baseInput,
        isGroupGift: true,
        quantity: 1,
      })

      expect(mocks.recomputeWishlistGiftProgress).toHaveBeenCalledTimes(1)
    })
  })
})
