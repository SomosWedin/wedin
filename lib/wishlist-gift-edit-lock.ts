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
    'Este regalo está reservado en un checkout. Podés cambiar el nombre y la foto; el precio, la cantidad y el tipo quedan fijos hasta que la reserva venza o el pago falle.',
  received:
    'Este regalo ya recibió contribuciones o pagos. Podés cambiar el nombre y la foto, pero no el precio, la cantidad ni el tipo.',
  manual:
    'Marcaste este regalo como recibido. Podés cambiar el nombre y la foto; desmarcalo para editar el resto.',
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
