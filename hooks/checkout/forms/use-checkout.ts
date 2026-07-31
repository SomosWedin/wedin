'use client';

import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createPagoparCheckoutSession,
  createTransactionsForCart,
} from '@/actions/data/checkout';
import { useToast } from '@/hooks/use-toast';
import { GuestCheckoutSchema } from '@/schemas/checkout';
import type { CartItem } from '@/hooks/use-cart-store';
import { publicEventPaths } from '@/lib/event-domain';

type UseCheckoutProps = {
  eventId: string;
  eventSlug: string;
  cartItems: CartItem[];
  onCheckoutStarted: () => void;
};

export function useCheckout({
  eventId,
  eventSlug,
  cartItems,
  onCheckoutStarted,
}: UseCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
  });
  const { isValid } = form.formState;

  const onSubmit: SubmitHandler<
    z.infer<typeof GuestCheckoutSchema>
  > = async values => {
    setLoading(true);

    const transactionsResponse = await createTransactionsForCart(
      eventId,
      values,
      cartItems.map(item => ({
        wishlistGiftId: item.wishlistGiftId,
        amount: item.amount,
      }))
    );

    if ('error' in transactionsResponse) {
      toast({
        title: 'Error al procesar el pago',
        description: transactionsResponse.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const transactionIds = transactionsResponse.success.map(
      transaction => transaction.id
    );

    if (values.paymentMethod === 'BANK_TRANSFER') {
      onCheckoutStarted();
      window.location.href = publicEventPaths.bankTransfer(transactionIds);
      return;
    }

    const sessionResponse = await createPagoparCheckoutSession(
      eventSlug,
      transactionIds
    );

    if ('error' in sessionResponse) {
      toast({
        title: 'Error al procesar el pago',
        description: sessionResponse.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    onCheckoutStarted();
    window.location.href = sessionResponse.redirectUrl;
  };

  return { loading, form, isValid, onSubmit };
}
