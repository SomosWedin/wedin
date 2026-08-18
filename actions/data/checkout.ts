'use server'

import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import { createOrder } from '@/lib/pagopar'
import prismaClient from '@/prisma/client'
import { GuestCheckoutSchema } from '@/schemas/checkout'
import { getErrorMessage, retryOnTransientWriteConflict } from '../helper'
import { getEventByUrl } from './public-event'
import { applyTransactionStatusChange } from './transaction'

export type CheckoutCartItem = {
  wishlistGiftId: string
  amount: string
  quantity: number
}

class CartClaimError extends Error {}

const CARD_OPEN_TIMEOUT_MINUTES = 3

const CARD_PENDING_TIMEOUT_MINUTES = 30

async function expireStaleHolds(wishlistGiftIds: string[]) {
  const openCutoff = new Date(
    Date.now() - CARD_OPEN_TIMEOUT_MINUTES * 60 * 1000
  )
  const pendingCutoff = new Date(
    Date.now() - CARD_PENDING_TIMEOUT_MINUTES * 60 * 1000
  )

  const staleTransactions = await prismaClient.transaction.findMany({
    where: {
      wishlistGiftId: { in: wishlistGiftIds },
      paymentMethod: 'CARD',
      OR: [
        { status: 'OPEN', createdAt: { lt: openCutoff } },
        { status: 'PENDING', createdAt: { lt: pendingCutoff } },
      ],
    },
    select: { id: true },
  })

  for (const { id } of staleTransactions) {
    await applyTransactionStatusChange(id, 'FAILED', null)
  }
}

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

  await expireStaleHolds(cartItems.map(item => item.wishlistGiftId))

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

      const price = Number(wishlistGift.gift.price) || 0
      const amount = Number(item.amount) || 0
      const requestedQty = wishlistGift.isGroupGift
        ? 1
        : Math.trunc(item.quantity) || 1

      const transaction = await retryOnTransientWriteConflict(() =>
        prismaClient.$transaction(async tx => {
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
                  reservedAmount: { lte: price - amount },
                },
                data: { reservedAmount: { increment: amount } },
              })
            : await tx.wishlistGift.updateMany({
                where: {
                  id: wishlistGift.id,
                  isGroupGift: false,
                  reservedQuantity: { lte: wishlistGift.quantity - requestedQty },
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

  const total = fullTransactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  )

  const [payer] = fullTransactions

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
