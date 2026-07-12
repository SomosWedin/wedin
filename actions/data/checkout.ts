'use server';

import { createPayment } from '@/lib/dlocal';
import prismaClient from '@/prisma/client';
import { GuestCheckoutSchema } from '@/schemas/checkout';
import type { z } from 'zod';
import { getErrorMessage } from '../helper';
import { applyTransactionStatusChange } from './transaction';

export type CheckoutCartItem = {
  wishlistGiftId: string;
  amount: string;
};

export async function createTransactionsForCart(
  eventId: string,
  payer: z.infer<typeof GuestCheckoutSchema>,
  cartItems: CheckoutCartItem[]
) {
  const validatedPayer = GuestCheckoutSchema.safeParse(payer);

  if (!validatedPayer.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' };
  }

  if (cartItems.length === 0) {
    return { error: 'Tu carrito está vacío.' };
  }

  const { payerName, payerEmail, paymentMethod } = validatedPayer.data;

  const wishlistGifts = await prismaClient.wishlistGift.findMany({
    where: { id: { in: cartItems.map(item => item.wishlistGiftId) } },
    include: {
      gift: true,
      transactions: { where: { status: 'COMPLETED' } },
    },
  });

  for (const item of cartItems) {
    const wishlistGift = wishlistGifts.find(
      wishlistGift => wishlistGift.id === item.wishlistGiftId
    );

    if (!wishlistGift) {
      return { error: 'Uno de los regalos ya no está disponible.' };
    }

    const amount = Number(item.amount) || 0;
    const price = Number(wishlistGift.gift.price) || 0;

    if (wishlistGift.isGroupGift) {
      const contributed = wishlistGift.transactions.reduce(
        (sum, transaction) => sum + (Number(transaction.amount) || 0),
        0
      );
      const remaining = price - contributed;

      if (amount <= 0 || amount > remaining) {
        return { error: 'El monto ingresado no es válido para este regalo.' };
      }
    } else if (amount !== price || wishlistGift.transactions.length > 0) {
      return { error: 'Este regalo ya fue comprado.' };
    }
  }

  try {
    const transactions = await prismaClient.$transaction(
      cartItems.map(item =>
        prismaClient.transaction.create({
          data: {
            wishlistGiftId: item.wishlistGiftId,
            eventId,
            amount: item.amount,
            payerName,
            payerEmail,
            paymentMethod,
            payerRole: 'INVITEE',
            payeeRole: 'ORGANIZER',
            status: paymentMethod === 'BANK_TRANSFER' ? 'PENDING' : 'OPEN',
          },
        })
      )
    );

    return { success: transactions };
  } catch (error) {
    console.error('Error creating transactions for cart:', error);
    return { error: getErrorMessage(error) };
  }
}

export async function createDlocalCheckoutSession(
  eventSlug: string,
  transactions: { id: string; amount: string }[]
) {
  if (transactions.length === 0) {
    return { error: 'No hay transacciones para procesar.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const total = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );
  const orderId = transactions.map(transaction => transaction.id).join(',');

  const payment = await createPayment({
    amount: total,
    currency: 'PYG',
    country: 'PY',
    orderId,
    description: 'Regalo de boda',
    successUrl: `${appUrl}/e/${eventSlug}/checkout/success`,
    backUrl: `${appUrl}/e/${eventSlug}/checkout`,
    notificationUrl: `${appUrl}/api/webhooks/dlocal`,
  });

  if ('error' in payment) {
    await markTransactionsFailed(transactions.map(transaction => transaction.id));
    return { error: payment.error };
  }

  try {
    await prismaClient.transaction.updateMany({
      where: { id: { in: transactions.map(transaction => transaction.id) } },
      data: { dlocalPaymentId: payment.success.id, status: 'PENDING' },
    });

    return { success: true, redirectUrl: payment.success.redirect_url };
  } catch (error) {
    console.error('Error persisting dLocal payment id:', error);
    await markTransactionsFailed(transactions.map(transaction => transaction.id));
    return { error: getErrorMessage(error) };
  }
}

async function markTransactionsFailed(transactionIds: string[]) {
  for (const transactionId of transactionIds) {
    await applyTransactionStatusChange(transactionId, 'FAILED', null);
  }
}

export async function getCheckoutTransactions(
  transactionIds: string[],
  eventId: string
) {
  try {
    return await prismaClient.transaction.findMany({
      where: {
        id: { in: transactionIds },
        eventId,
        paymentMethod: 'BANK_TRANSFER',
      },
      include: { wishlistGift: { include: { gift: true } } },
    });
  } catch (error) {
    console.error('Error retrieving checkout transactions:', error);
    return [];
  }
}
