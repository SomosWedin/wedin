'use server'

import type { PayoutStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import prismaClient from '@/prisma/client'
import { PayoutEditSchema } from '@/schemas/form'
import { RequestPayoutParams } from '@/schemas/params'
import { getCurrentUser } from '../get-current-user'
import { getErrorMessage } from '../helper'
import { getBankDetails } from './bank-details'
import { ORGANIZER_SERVICE_FEE_RATE } from './fee'

export type WalletSummary = {
  totalReceived: number
  serviceFee: number
  totalRequested: number
  inTransit: number
  settled: number
  balance: number
}

const EMPTY_WALLET_SUMMARY: WalletSummary = {
  totalReceived: 0,
  serviceFee: 0,
  totalRequested: 0,
  inTransit: 0,
  settled: 0,
  balance: 0,
}

const sumAmounts = (rows: { amount: string }[]) =>
  rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)

export async function getWalletSummary(
  eventId: string
): Promise<WalletSummary> {
  try {
    const [completedTransactions, activePayouts] = await Promise.all([
      prismaClient.transaction.findMany({
        where: { eventId, status: 'COMPLETED' },
        select: { amount: true },
      }),
      prismaClient.payout.findMany({
        where: { eventId, status: { not: 'REJECTED' } },
        select: { amount: true, status: true },
      }),
    ])

    const totalReceived = Math.round(sumAmounts(completedTransactions))
    const serviceFee = Math.round(totalReceived * ORGANIZER_SERVICE_FEE_RATE)
    const totalRequested = Math.round(sumAmounts(activePayouts))
    const settled = Math.round(
      sumAmounts(activePayouts.filter(payout => payout.status === 'COMPLETED'))
    )

    return {
      totalReceived,
      serviceFee,
      totalRequested,
      inTransit: totalRequested - settled,
      settled,
      balance: totalReceived - serviceFee - totalRequested,
    }
  } catch (error) {
    console.error('Error getting wallet summary:', error)
    return EMPTY_WALLET_SUMMARY
  }
}

export async function getPayouts(eventId: string) {
  try {
    return await prismaClient.payout.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error retrieving payouts:', error)
    return []
  }
}

export async function requestPayout(
  eventId: string,
  values: z.infer<typeof RequestPayoutParams>
) {
  const validatedFields = RequestPayoutParams.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Monto inválido, por favor verifica el valor ingresado.' }
  }

  const amount = Number(validatedFields.data.amount)

  if (!amount || amount <= 0) {
    return { error: 'El monto debe ser mayor a 0.' }
  }

  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: 'Debes iniciar sesión para solicitar un retiro.' }
  }

  const bankDetails = await getBankDetails(eventId)

  if (!bankDetails) {
    return {
      error: 'Configura tus datos bancarios antes de solicitar un retiro.',
    }
  }

  const { balance } = await getWalletSummary(eventId)

  if (amount > balance) {
    return { error: 'El monto solicitado supera tu saldo disponible.' }
  }

  try {
    await prismaClient.payout.create({
      data: {
        amount: validatedFields.data.amount,
        eventId,
        bankDetailsId: bankDetails.id,
        requestedById: currentUser.id,
        status: 'REQUESTED',
      },
    })

    revalidatePath('/billetera')
    return { success: true }
  } catch (error) {
    console.error('Error creating payout request:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function getAllPayoutsForAdmin() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') return []

  try {
    return await prismaClient.payout.findMany({
      include: {
        bankDetails: true,
        event: { include: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error retrieving payouts for admin:', error)
    return []
  }
}

export async function updatePayoutStatusAsAdmin(
  payoutId: string,
  status: PayoutStatus
) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    return { error: 'No autorizado.' }
  }

  const validatedStatus = PayoutEditSchema.shape.status.safeParse(status)

  if (!validatedStatus.success) {
    return { error: 'Estado inválido.' }
  }

  try {
    await prismaClient.payout.update({
      where: { id: payoutId },
      data: { status: validatedStatus.data },
    })

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error updating payout status as admin:', error)
    return { error: getErrorMessage(error) }
  }
}
