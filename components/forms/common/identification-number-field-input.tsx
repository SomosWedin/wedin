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
import { formatRuc, groupByThousands } from '@/lib/format-identification'

type IdentificationNumberFieldProps = {
  field: ControllerRenderProps<
    { identificationNumber: string },
    'identificationNumber'
  >
  identificationType?: string
  disabled?: boolean
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
            identificationType === 'ruc' ? 'Ej. 800.223-5' : 'Ej. 1.234.567'
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
