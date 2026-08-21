'use server'

import type { PayoutStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import prismaClient from '@/prisma/client'
import { PayoutEditSchema } from '@/schemas/form'
import { RequestPayoutParams } from '@/schemas/params'
import { getAdminSessionUser } from '../auth/admin-session'
import { getCurrentUser } from '../get-current-user'
import { getErrorMessage } from '../helper'
import { getBankDetails } from './bank-details'

async function getEventFinancials(eventId: string) {
  const [completedTransactions, activePayouts] = await Promise.all([
    prismaClient.transaction.findMany({
      where: { eventId, status: 'COMPLETED' },
      select: { amount: true },
    }),
    prismaClient.payout.findMany({
      where: { eventId, status: { not: 'REJECTED' } },
      select: { amount: true },
    }),
  ])

  return { completedTransactions, activePayouts }
}

export async function getEventBalance(eventId: string): Promise<number> {
  try {
    const { completedTransactions, activePayouts } =
      await getEventFinancials(eventId)

    const totalReceived = completedTransactions.reduce(
      (sum, transaction) => sum + (Number(transaction.amount) || 0),
      0
    )
    const totalPaidOut = activePayouts.reduce(
      (sum, payout) => sum + (Number(payout.amount) || 0),
      0
    )

    return totalReceived - totalPaidOut
  } catch (error) {
    console.error('Error computing event balance:', error)
    return 0
  }
}

export async function getWalletSummary(eventId: string) {
  try {
    const { completedTransactions, activePayouts } =
      await getEventFinancials(eventId)

    const totalReceived = completedTransactions.reduce(
      (sum, transaction) => sum + (Number(transaction.amount) || 0),
      0
    )
    const totalPaidOut = activePayouts.reduce(
      (sum, payout) => sum + (Number(payout.amount) || 0),
      0
    )

    return {
      totalReceived,
      giftsCount: completedTransactions.length,
      balance: totalReceived - totalPaidOut,
    }
  } catch (error) {
    console.error('Error getting wallet summary:', error)
    return { totalReceived: 0, giftsCount: 0, balance: 0 }
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

  const balance = await getEventBalance(eventId)

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
  const currentUser = await getAdminSessionUser()

  if (!currentUser) return []

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
  const currentUser = await getAdminSessionUser()

  if (!currentUser) {
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
