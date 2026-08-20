'use client'

import { Loader2 } from 'lucide-react'
import type { BaseSyntheticEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import PriceInput from '@/components/forms/common/price-input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RequestPayoutFormValues } from '@/hooks/dialog/forms/use-request-payout-dialog'

type RequestPayoutFormProps = {
  form: UseFormReturn<RequestPayoutFormValues>
  balance: number
  loading: boolean
  isValid: boolean
  onAmountChange: (nextAmount: string) => void
  onCompleteTotalChange: (checked: boolean | 'indeterminate') => void
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
  onCancel: () => void
}

export default function RequestPayoutForm({
  form,
  balance,
  loading,
  isValid,
  onAmountChange,
  onCompleteTotalChange,
  onSubmit,
  onCancel,
}: RequestPayoutFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-textTertiary">
          Disponible para retiro: Gs. {balance.toLocaleString('es-PY')}
        </p>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto a retirar</FormLabel>

              <FormControl>
                <PriceInput
                  value={field.value}
                  onChange={onAmountChange}
                  onBlur={field.onBlur}
                />
              </FormControl>

              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="completeTotal"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  id="complete-total"
                  checked={field.value}
                  onCheckedChange={onCompleteTotalChange}
                />
              </FormControl>

              <FormLabel
                htmlFor="complete-total"
                className="!mt-0 cursor-pointer font-normal"
              >
                Retirar el monto total disponible
              </FormLabel>
            </FormItem>
          )}
        />

        <div className="-mx-6 -mb-6 flex justify-end gap-2 rounded-b-lg bg-gray-50 px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="success"
            className="gap-2"
            disabled={loading || !isValid}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
