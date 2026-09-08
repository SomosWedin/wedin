// MongoDB does not enforce foreign keys, so a deleted Gift leaves
// WishlistGift.giftId dangling. The relation is optional to keep those rows
// readable instead of throwing; these are what the UI shows in their place.
export const MISSING_GIFT_LABEL = 'Regalo no disponible'

export const MISSING_GIFT_EDIT_ERROR =
  'Este regalo ya no existe en el catálogo y no se puede editar. Eliminalo de tu lista.'

export function giftLabel(gift: { name: string } | null | undefined) {
  return gift?.name ?? MISSING_GIFT_LABEL
}
