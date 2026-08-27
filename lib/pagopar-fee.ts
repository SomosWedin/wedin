// Pagopar requires monto_total to equal the sum of every item's
// precio_total, so the service fee can't be sent as its own line if we
// don't want it to show up as a separate item on Pagopar's checkout page —
// it has to be folded into the gift prices instead. This splits it
// proportionally to each item's amount using a largest-remainder
// allocation, so the per-guaraní rounding still sums to exactly
// `serviceFee` (amounts here are whole guaraníes, no decimals).
export function distributeServiceFee(
  amounts: number[],
  serviceFee: number
): number[] {
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0)

  if (serviceFee <= 0 || subtotal <= 0) {
    return amounts
  }

  const shares = amounts.map(amount => (amount / subtotal) * serviceFee)
  const feeShares = shares.map(Math.floor)
  let leftover = serviceFee - feeShares.reduce((sum, share) => sum + share, 0)

  const byRemainderDesc = shares
    .map((share, index) => ({ index, remainder: share - feeShares[index] }))
    .sort((a, b) => b.remainder - a.remainder)

  for (const { index } of byRemainderDesc) {
    if (leftover <= 0) break
    feeShares[index] += 1
    leftover -= 1
  }

  return amounts.map((amount, index) => amount + feeShares[index])
}
