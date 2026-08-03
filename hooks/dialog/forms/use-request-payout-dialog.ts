'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { usePayout } from '@/hooks/dashboard/use-payout'

const createRequestPayoutSchema = (balance: number) =>
  z.object({
    amount: z
      .string()
      .min(1, {
        message: 'Ingresá un monto',
      })
      .refine(
        value => {
          const amount = Number(value)

          return Number.isFinite(amount) && amount > 0 && amount <= balance
        },
        {
          message:
            `El monto debe ser mayor a 0 y no superar Gs. ` +
            balance.toLocaleString('es-PY'),
        }
      ),
  })

export type RequestPayoutFormValues = z.infer<
  ReturnType<typeof createRequestPayoutSchema>
>

type UseRequestPayoutDialogProps = {
  eventId: string
  balance: number
}

export function useRequestPayoutDialog({
  eventId,
  balance,
}: UseRequestPayoutDialogProps) {
  const [open, setOpen] = useState(false)
  const { loading, requestPayout } = usePayout()

  const schema = useMemo(() => createRequestPayoutSchema(balance), [balance])

  const form = useForm<RequestPayoutFormValues>({
    resolver: zodResolver(schema),
    mode: 'all',
    defaultValues: {
      amount: '',
    },
  })

  useEffect(() => {
    if (open) {
      void form.trigger('amount')
    }
  }, [balance, open, form])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      form.reset({
        amount: '',
      })
    }
  }

  const onSubmit: SubmitHandler<RequestPayoutFormValues> = async values => {
    const response = await requestPayout(eventId, values)

    if (!response.error) {
      handleOpenChange(false)
    }
  }

  return {
    form,
    open,
    loading,
    isValid: form.formState.isValid,
    handleOpenChange,
    handleSubmit: form.handleSubmit(onSubmit),
  }
}
