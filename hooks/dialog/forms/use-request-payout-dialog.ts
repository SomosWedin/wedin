'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form'
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
    completeTotal: z.boolean().default(false),
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
    mode: 'onChange',
    defaultValues: {
      amount: '',
      completeTotal: false,
    },
  })

  const completeTotal =
    useWatch({
      control: form.control,
      name: 'completeTotal',
    }) ?? false

  useEffect(() => {
    if (open && form.getValues('amount')) {
      void form.trigger('amount')
    }
  }, [balance, open, form])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      form.reset({
        amount: '',
        completeTotal: false,
      })
    }
  }

  const handleAmountChange = (nextAmount: string) => {
    form.setValue('amount', nextAmount, {
      shouldDirty: true,
      shouldValidate: true,
    })

    if (completeTotal) {
      form.setValue('completeTotal', false, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const handleCompleteTotalChange = (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true

    form.setValue('completeTotal', isChecked, {
      shouldDirty: true,
      shouldValidate: true,
    })

    if (isChecked) {
      form.setValue('amount', String(balance), {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const onSubmit: SubmitHandler<RequestPayoutFormValues> = async values => {
    const response = await requestPayout(eventId, { amount: values.amount })

    if (!response.error) {
      handleOpenChange(false)
    }
  }

  return {
    form,
    open,
    loading,
    completeTotal,
    isValid: form.formState.isValid,
    handleOpenChange,
    handleAmountChange,
    handleCompleteTotalChange,
    handleSubmit: form.handleSubmit(onSubmit),
  }
}
