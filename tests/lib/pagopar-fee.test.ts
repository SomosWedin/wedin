import { describe, expect, it } from 'vitest'

import { distributeServiceFee } from '@/lib/pagopar-fee'

describe('distributeServiceFee', () => {
  it('folds the fee into a single item entirely', () => {
    expect(distributeServiceFee([85000], 2550)).toEqual([87550])
  })

  it('splits the fee proportionally across items and matches the total exactly', () => {
    const amounts = [85000, 15000]
    const serviceFee = 3000
    const result = distributeServiceFee(amounts, serviceFee)

    expect(result).toEqual([87550, 15450])
    expect(result.reduce((sum, amount) => sum + amount, 0)).toBe(
      amounts.reduce((sum, amount) => sum + amount, 0) + serviceFee
    )
  })

  it('keeps the sum exact when proportional shares do not divide evenly', () => {
    const amounts = [10000, 10000, 10000]
    const serviceFee = 100 // 33.33 per item

    const result = distributeServiceFee(amounts, serviceFee)

    expect(result.reduce((sum, amount) => sum + amount, 0)).toBe(30100)
    // the extra guaraní from the rounding remainder lands on exactly one item
    expect(result.filter(amount => amount === 10034)).toHaveLength(1)
    expect(result.filter(amount => amount === 10033)).toHaveLength(2)
  })

  it('is a no-op when there is no fee', () => {
    expect(distributeServiceFee([85000, 15000], 0)).toEqual([85000, 15000])
  })

  it('handles a single guaraní of rounding leftover across many items', () => {
    const amounts = Array.from({ length: 7 }, () => 1000)
    const serviceFee = 10 // does not divide evenly by 7

    const result = distributeServiceFee(amounts, serviceFee)

    expect(result.reduce((sum, amount) => sum + amount, 0)).toBe(7010)
  })
})
