'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { digitsOnly, formatRuc } from '@/lib/format-identification'

type RucInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const RucInput = ({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: RucInputProps) => {
  const [displayValue, setDisplayValue] = useState(() =>
    formatRuc(digitsOnly(value))
  )

  useEffect(() => {
    setDisplayValue(formatRuc(digitsOnly(value)))
  }, [value])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = digitsOnly(event.target.value)

    setDisplayValue(formatRuc(rawValue))
    onChange(rawValue)
  }

  return (
    <Input
      type="text"
      placeholder={placeholder}
      className={className}
      value={displayValue}
      onChange={handleInputChange}
      disabled={disabled}
    />
  )
}

export default RucInput
