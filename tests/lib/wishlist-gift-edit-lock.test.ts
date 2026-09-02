import { describe, expect, it } from 'vitest'
import {
  getWishlistGiftEditLockReason,
  WISHLIST_GIFT_EDIT_LOCK_MESSAGES,
} from '@/lib/wishlist-gift-edit-lock'

const unlocked = {
  isFullyPaid: false,
  isManuallyReceived: false,
  groupGiftParts: '0',
  reservedQuantity: 0,
  reservedAmount: 0,
  hasCompletedTransaction: false,
}

describe('wishlist gift edit lock', () => {
  it('allows edits before any checkout activity', () => {
    expect(getWishlistGiftEditLockReason(unlocked)).toBeNull()
  })

  it.each([
    [{ ...unlocked, reservedQuantity: 1 }, 'reservation'],
    [{ ...unlocked, reservedAmount: 25000 }, 'reservation'],
    [{ ...unlocked, hasCompletedTransaction: true }, 'received'],
    [{ ...unlocked, groupGiftParts: '25000' }, 'received'],
    [{ ...unlocked, isFullyPaid: true }, 'received'],
    [{ ...unlocked, isManuallyReceived: true }, 'manual'],
  ] as const)('returns the visible lock reason for %#', (state, reason) => {
    expect(getWishlistGiftEditLockReason(state)).toBe(reason)
    expect(WISHLIST_GIFT_EDIT_LOCK_MESSAGES[reason]).not.toHaveLength(0)
  })
})
