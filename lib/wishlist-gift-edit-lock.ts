export type WishlistGiftEditLockReason = 'reservation' | 'received' | 'manual'

type WishlistGiftEditLockState = {
  isFullyPaid: boolean
  isManuallyReceived: boolean
  groupGiftParts: string
  reservedQuantity: number
  reservedAmount: number
  hasCompletedTransaction: boolean
}

export const WISHLIST_GIFT_EDIT_LOCK_MESSAGES: Record<
  WishlistGiftEditLockReason,
  string
> = {
  reservation:
    'Este regalo está reservado en un checkout. Podrás editarlo si la reserva vence o el pago falla.',
  received:
    'Este regalo ya recibió contribuciones o pagos y no se puede editar.',
  manual: 'Marcaste este regalo como recibido. Desmarcalo para poder editarlo.',
}

export function getWishlistGiftEditLockReason({
  isFullyPaid,
  isManuallyReceived,
  groupGiftParts,
  reservedQuantity,
  reservedAmount,
  hasCompletedTransaction,
}: WishlistGiftEditLockState): WishlistGiftEditLockReason | null {
  if (isFullyPaid || Number(groupGiftParts) > 0 || hasCompletedTransaction) {
    return 'received'
  }

  if (reservedQuantity > 0 || reservedAmount > 0) return 'reservation'
  if (isManuallyReceived) return 'manual'

  return null
}
