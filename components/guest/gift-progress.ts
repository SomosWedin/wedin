export function computePercentage(priceValue: number, contributed: number) {
  return priceValue > 0
    ? Math.min(100, Math.round((contributed / priceValue) * 100))
    : 0
}

export function getGiftProgress(
  price: string,
  transactions: { amount: string }[]
) {
  const priceValue = Number(price) || 0
  const contributed = transactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  )
  const remaining = Math.max(0, priceValue - contributed)
  const percentage = computePercentage(priceValue, contributed)

  return { priceValue, contributed, remaining, percentage }
}

export function getQuantityProgress(
  quantity: number,
  transactions: { quantity: number }[]
) {
  const completedQuantity = transactions.reduce(
    (sum, transaction) => sum + transaction.quantity,
    0
  )
  const remainingStock = Math.max(0, quantity - completedQuantity)

  return { completedQuantity, remainingStock }
}

export type CompletableWishlistGift = {
  isFullyPaid: boolean
  isManuallyReceived: boolean
  isGroupGift: boolean
  quantity: number
  gift: { price: string }
  transactions: { amount: string; quantity: number }[]
}

export function isGiftComplete(wishlistGift: CompletableWishlistGift) {
  const { priceValue, remaining } = getGiftProgress(
    wishlistGift.gift.price,
    wishlistGift.transactions
  )
  const { remainingStock } = getQuantityProgress(
    wishlistGift.quantity,
    wishlistGift.transactions
  )

  return (
    wishlistGift.isFullyPaid ||
    wishlistGift.isManuallyReceived ||
    (wishlistGift.isGroupGift
      ? priceValue > 0 && remaining <= 0
      : remainingStock <= 0)
  )
}
