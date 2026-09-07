export const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '')

// Groups digits by thousands, e.g. "4705899" -> "4.705.899".
export const groupByThousands = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

// RUC = dot-grouped base number + dash + check digit, e.g. "800.022.353-8".
export const formatRuc = (value: string) => {
  if (value.length <= 1) return value
  const base = value.slice(0, -1)
  const checkDigit = value.slice(-1)
  return `${groupByThousands(base)}-${checkDigit}`
}
