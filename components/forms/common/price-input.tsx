'use client'

import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'

type PriceInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
}

export default function PriceInput({
  value,
  onChange,
  onBlur,
  disabled,
}: PriceInputProps) {
  const displayValue = value ? Number(value).toLocaleString('es-PY') : ''

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value.replace(/\D/g, ''))
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="Gs. 2.000.000"
      value={displayValue}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled}
    />
  )
}
