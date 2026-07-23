'use server';

import { createOrder } from '@/lib/pagopar';
import prismaClient from '@/prisma/client';
import { GuestCheckoutSchema } from '@/schemas/checkout';
import type { z } from 'zod';
import { getErrorMessage } from '../helper';
import { getEventByUrl } from './public-event';
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

  const { payerName, payerEmail, payerDocument, paymentMethod } =
    validatedPayer.data;

  const wishlistGifts = await prismaClient.wishlistGift.findMany({
    where: {
      id: { in: cartItems.map(item => item.wishlistGiftId) },
      eventId,
      isReceived: false,
    },
    include: {
      gift: true,
      transactions: { where: { status: { in: ['OPEN', 'PENDING', 'COMPLETED'] } } },
    },
  });

  const seenIndividualGiftIds = new Set<string>();

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
      const contributed = wishlistGift.transactions
        .filter(transaction => transaction.status === 'COMPLETED')
        .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
      const remaining = price - contributed;

      if (amount <= 0 || amount > remaining) {
        return { error: 'El monto ingresado no es válido para este regalo.' };
      }
    } else {
      if (seenIndividualGiftIds.has(item.wishlistGiftId)) {
        return { error: 'Este regalo ya fue comprado.' };
      }
      seenIndividualGiftIds.add(item.wishlistGiftId);

      if (amount !== price || wishlistGift.transactions.length > 0) {
        return { error: 'Este regalo ya fue comprado.' };
      }
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
            payerDocument,
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

export async function createPagoparCheckoutSession(
  eventSlug: string,
  transactionIds: string[]
) {
  if (transactionIds.length === 0) {
    return { error: 'No hay transacciones para procesar.' };
  }

  const event = await getEventByUrl(eventSlug);

  if (!event) {
    return { error: 'Evento no encontrado.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orderId = transactionIds.join(',');

  const fullTransactions = await prismaClient.transaction.findMany({
    where: { id: { in: transactionIds }, eventId: event.id, status: 'OPEN' },
    include: { wishlistGift: { include: { gift: true } } },
  });

  if (fullTransactions.length !== transactionIds.length) {
    await markTransactionsFailed(transactionIds);
    return { error: 'Una de las transacciones ya no está disponible.' };
  }

  const total = fullTransactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  );

  const [payer] = fullTransactions;

  const order = await createOrder({
    orderId,
    totalAmount: total,
    description: 'Regalo de boda',
    payer: {
      name: payer.payerName || '',
      email: payer.payerEmail || '',
      documento: payer.payerDocument || '',
    },
    items: fullTransactions.map(transaction => ({
      name: transaction.wishlistGift.gift.name,
      amount: Number(transaction.amount),
    })),
  });

  if ('error' in order) {
    await markTransactionsFailed(transactionIds);
    return { error: order.error };
  }

  try {
    await prismaClient.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { pagoparHash: order.success.hash },
    });

    await Promise.all(
      transactionIds.map(id => applyTransactionStatusChange(id, 'PENDING', null))
    );

    // TODO: append ?forma_pago=<id> once Pagopar support confirms the
    // value(s) for Tarjeta de crédito/QR and approves this account for the
    // redirect-time payment-method restriction (docs say it's gated,
    // separate from having the payment methods themselves enabled).
    const redirectUrl = order.success.hash.startsWith('STUB-')
      ? `${appUrl}/checkout/pagopar/result/${order.success.hash}?stub=1`
      : `https://www.pagopar.com/pagos/${order.success.hash}`;

    return { success: true, redirectUrl };
  } catch (error) {
    console.error('Error persisting Pagopar order hash:', error);
    await markTransactionsFailed(transactionIds);
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
