'use server'

import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import { createOrder } from '@/lib/pagopar'
import prismaClient from '@/prisma/client'
import { GuestCheckoutSchema } from '@/schemas/checkout'
import { getErrorMessage, retryOnTransientWriteConflict } from '../helper'
import { INVITEES_SERVICE_FEE_RATE } from './fee'
import { getEventByUrl } from './public-event'
import { releaseExpiredHolds } from './reservation'
import { applyTransactionStatusChange } from './transaction'

export type CheckoutCartItem = {
  wishlistGiftId: string
  amount: string
  quantity: number
}

class CartClaimError extends Error {}

export async function createTransactionsForCart(
  eventId: string,
  payer: z.infer<typeof GuestCheckoutSchema>,
  cartItems: CheckoutCartItem[]
) {
  const validatedPayer = GuestCheckoutSchema.safeParse(payer)

  if (!validatedPayer.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  if (cartItems.length === 0) {
    return { error: 'Tu carrito está vacío.' }
  }

  const {
    payerName,
    payerEmail,
    payerDocument,
    payerPhone,
    payerMessage,
    paymentMethod,
  } = validatedPayer.data

  const bankTransferGroupId =
    paymentMethod === 'BANK_TRANSFER' ? randomUUID() : undefined

  await releaseExpiredHolds({
    wishlistGiftIds: cartItems.map(item => item.wishlistGiftId),
  })

  const wishlistGifts = await prismaClient.wishlistGift.findMany({
    where: {
      id: { in: cartItems.map(item => item.wishlistGiftId) },
      eventId,
      isReceived: false,
      isManuallyReceived: false,
    },
    include: {
      gift: true,
      transactions: {
        where: { status: { in: ['OPEN', 'PENDING', 'COMPLETED'] } },
      },
    },
  })

  const seenIndividualGiftIds = new Set<string>()

  for (const item of cartItems) {
    const wishlistGift = wishlistGifts.find(
      wishlistGift => wishlistGift.id === item.wishlistGiftId
    )

    if (!wishlistGift) {
      return { error: 'Uno de los regalos ya no está disponible.' }
    }

    const amount = Number(item.amount) || 0
    const price = Number(wishlistGift.gift.price) || 0

    if (wishlistGift.isGroupGift) {
      const contributed = wishlistGift.transactions
        .filter(transaction => transaction.status === 'COMPLETED')
        .reduce(
          (sum, transaction) => sum + (Number(transaction.amount) || 0),
          0
        )
      const remaining = price - contributed

      if (amount <= 0 || amount > remaining) {
        return { error: 'El monto ingresado no es válido para este regalo.' }
      }
    } else {
      if (seenIndividualGiftIds.has(item.wishlistGiftId)) {
        return {
          error: `Agregaste "${wishlistGift.gift.name}" más de una vez a tu carrito.`,
        }
      }
      seenIndividualGiftIds.add(item.wishlistGiftId)

      const requestedQty = Math.trunc(item.quantity) || 0
      const completedQty = wishlistGift.transactions
        .filter(transaction => transaction.status === 'COMPLETED')
        .reduce((sum, transaction) => sum + transaction.quantity, 0)
      const remainingStock = wishlistGift.quantity - completedQty

      if (
        requestedQty < 1 ||
        amount !== price * requestedQty ||
        requestedQty > remainingStock
      ) {
        return {
          error: `"${wishlistGift.gift.name}" ya no está disponible.`,
        }
      }
    }
  }

  const createdTransactionIds: string[] = []

  try {
    for (const item of cartItems) {
      const wishlistGift = wishlistGifts.find(
        wishlistGift => wishlistGift.id === item.wishlistGiftId
      )

      if (!wishlistGift) {
        throw new CartClaimError('Uno de los regalos ya no está disponible.')
      }

      const amount = Number(item.amount) || 0
      const requestedQty = wishlistGift.isGroupGift
        ? 1
        : Math.trunc(item.quantity) || 1

      const transaction = await retryOnTransientWriteConflict(() =>
        prismaClient.$transaction(async tx => {
          // Live read, not the outer snapshot — a concurrent edit lands as
          // a write conflict on commit, which retryOnTransientWriteConflict retries.
          const liveWishlistGift = await tx.wishlistGift.findUnique({
            where: { id: wishlistGift.id },
            select: { quantity: true, gift: { select: { price: true } } },
          })

          if (!liveWishlistGift) {
            throw new CartClaimError(
              `"${wishlistGift.gift.name}" ya no está disponible.`
            )
          }

          const livePrice = Number(liveWishlistGift.gift.price) || 0

          const created = await tx.transaction.create({
            data: {
              wishlistGiftId: item.wishlistGiftId,
              eventId,
              amount: item.amount,
              quantity: requestedQty,
              payerName,
              payerEmail,
              payerDocument,
              payerPhone,
              payerMessage,
              paymentMethod,
              bankTransferGroupId,
              payerRole: 'INVITEE',
              payeeRole: 'ORGANIZER',
              status: paymentMethod === 'BANK_TRANSFER' ? 'PENDING' : 'OPEN',
            },
          })

          const claim = wishlistGift.isGroupGift
            ? await tx.wishlistGift.updateMany({
                where: {
                  id: wishlistGift.id,
                  isGroupGift: true,
                  reservedAmount: { lte: livePrice - amount },
                },
                data: { reservedAmount: { increment: amount } },
              })
            : await tx.wishlistGift.updateMany({
                where: {
                  id: wishlistGift.id,
                  isGroupGift: false,
                  reservedQuantity: {
                    lte: liveWishlistGift.quantity - requestedQty,
                  },
                },
                data: { reservedQuantity: { increment: requestedQty } },
              })

          if (claim.count !== 1) {
            throw new CartClaimError(
              `"${wishlistGift.gift.name}" ya no está disponible — alguien más lo reservó recién.`
            )
          }

          return created
        })
      )

      createdTransactionIds.push(transaction.id)
    }

    const transactions = await prismaClient.transaction.findMany({
      where: { id: { in: createdTransactionIds } },
    })

    return { success: transactions }
  } catch (error) {
    for (const transactionId of createdTransactionIds) {
      await applyTransactionStatusChange(transactionId, 'FAILED', null)
    }

    if (error instanceof CartClaimError) {
      return { error: error.message }
    }

    console.error('Error creating transactions for cart:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function createPagoparCheckoutSession(
  eventSlug: string,
  transactionIds: string[]
) {
  if (transactionIds.length === 0) {
    return { error: 'No hay transacciones para procesar.' }
  }

  const event = await getEventByUrl(eventSlug)

  if (!event) {
    return { error: 'Evento no encontrado.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const orderId = transactionIds[0]

  const fullTransactions = await prismaClient.transaction.findMany({
    where: { id: { in: transactionIds }, eventId: event.id, status: 'OPEN' },
    include: {
      wishlistGift: { include: { gift: { include: { image: true } } } },
    },
  })

  if (fullTransactions.length !== transactionIds.length) {
    await markTransactionsFailed(transactionIds)
    return { error: 'Una de las transacciones ya no está disponible.' }
  }

  const subTotal = fullTransactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  )
  const serviceFee = Math.round(subTotal * INVITEES_SERVICE_FEE_RATE)
  const total = serviceFee + subTotal

  const [payer] = fullTransactions

  const order = await createOrder({
    description: 'Regalo de boda',
    orderId,
    serviceFee,
    totalAmount: total,
    payer: {
      name: payer.payerName || '',
      email: payer.payerEmail || '',
      documento: payer.payerDocument || '',
    },
    items: fullTransactions.map(transaction => ({
      name: transaction.wishlistGift.gift.name,
      amount: Number(transaction.amount),
      quantity: transaction.quantity,
      imageUrl: transaction.wishlistGift.gift.image?.url ?? null,
    })),
  })

  if ('error' in order) {
    await markTransactionsFailed(transactionIds)
    return { error: order.error }
  }

  try {
    await prismaClient.transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { pagoparHash: order.success.hash },
    })

    await Promise.all(
      transactionIds.map(id =>
        applyTransactionStatusChange(id, 'PENDING', null)
      )
    )

    const redirectUrl = order.success.hash.startsWith('STUB-')
      ? `${appUrl}/checkout/pagopar/result/${order.success.hash}?stub=1`
      : `https://www.pagopar.com/pagos/${order.success.hash}`

    return { success: true, redirectUrl }
  } catch (error) {
    console.error('Error persisting Pagopar order hash:', error)
    await markTransactionsFailed(transactionIds)
    return { error: getErrorMessage(error) }
  }
}

async function markTransactionsFailed(transactionIds: string[]) {
  for (const transactionId of transactionIds) {
    await applyTransactionStatusChange(transactionId, 'FAILED', null)
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
    })
  } catch (error) {
    console.error('Error retrieving checkout transactions:', error)
    return []
  }
}
