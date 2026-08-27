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
