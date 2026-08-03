'use client'

import { useEffect, useState } from 'react'
import type { ControllerRenderProps } from 'react-hook-form'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

type IdentificationNumberFieldProps = {
  field: ControllerRenderProps<
    { identificationNumber: string },
    'identificationNumber'
  >
  identificationType?: string
  disabled?: boolean
}

// Groups digits by thousands, e.g. "4705899" -> "4.705.899".
const groupByThousands = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

// RUC = dot-grouped base number + dash + check digit, e.g. "800.022.353-8".
const formatRuc = (value: string) => {
  if (value.length <= 1) return value
  const base = value.slice(0, -1)
  const checkDigit = value.slice(-1)
  return `${groupByThousands(base)}-${checkDigit}`
}

const IdentificationNumberField = ({
  field,
  identificationType = 'ci',
  disabled = false,
}: IdentificationNumberFieldProps) => {
  const [displayValue, setDisplayValue] = useState(field.value)

  useEffect(() => {
    setDisplayValue(
      identificationType === 'ruc'
        ? formatRuc(field.value)
        : groupByThousands(field.value)
    )
  }, [field.value, identificationType])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    const formattedValue =
      identificationType === 'ruc'
        ? formatRuc(rawValue)
        : groupByThousands(rawValue)

    setDisplayValue(formattedValue)
    field.onChange(rawValue)
  }

  return (
    <FormItem className="w-full">
      <FormLabel>Número de documento</FormLabel>
      <FormControl className="!mt-1.5">
        <Input
          type="text"
          placeholder={
            identificationType === 'ruc' ? 'Ej. 800.223-5' : 'Ej. 4.705.899'
          }
          value={displayValue}
          onChange={handleInputChange}
          disabled={disabled}
        />
      </FormControl>
      <FormMessage className="font-normal text-red-600" />
    </FormItem>
  )
}

export default IdentificationNumberField
