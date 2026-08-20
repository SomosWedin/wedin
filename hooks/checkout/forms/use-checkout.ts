'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  createPagoparCheckoutSession,
  createTransactionsForCart,
} from '@/actions/data/checkout'
import type { CartItem } from '@/hooks/use-cart-store'
import { useToast } from '@/hooks/use-toast'
import { publicEventPaths } from '@/lib/event-domain'
import { GuestCheckoutSchema } from '@/schemas/checkout'

type UseCheckoutProps = {
  eventId: string
  eventSlug: string
  cartItems: CartItem[]
  onCheckoutStarted: () => void
}

export function useCheckout({
  eventId,
  eventSlug,
  cartItems,
  onCheckoutStarted,
}: UseCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof GuestCheckoutSchema>>({
    resolver: zodResolver(GuestCheckoutSchema),
    mode: 'onTouched',
    defaultValues: {
      payerName: '',
      payerEmail: '',
      payerDocument: '',
      payerPhone: '',
      payerMessage: '',
      paymentMethod: 'CARD',
    },
  })
  const { isValid } = form.formState

  const onSubmit: SubmitHandler<
    z.infer<typeof GuestCheckoutSchema>
  > = async values => {
    setLoading(true)

    const transactionsResponse = await createTransactionsForCart(
      eventId,
      values,
      cartItems.map(item => ({
        wishlistGiftId: item.wishlistGiftId,
        amount: item.amount,
        quantity: item.quantity,
      }))
    )

    if ('error' in transactionsResponse) {
      toast({
        title: 'Error al procesar el pago',
        description: transactionsResponse.error,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const transactionIds = transactionsResponse.success.map(
      transaction => transaction.id
    )

    if (values.paymentMethod === 'BANK_TRANSFER') {
      onCheckoutStarted()
      window.location.href = publicEventPaths.bankTransfer(transactionIds)
      return
    }

    const sessionResponse = await createPagoparCheckoutSession(
      eventSlug,
      transactionIds
    )

    if ('error' in sessionResponse) {
      toast({
        title: 'Error al procesar el pago',
        description: sessionResponse.error,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    onCheckoutStarted()
    window.location.href = sessionResponse.redirectUrl
  }

  return { loading, form, isValid, onSubmit }
}
