'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import prismaClient from '@/prisma/client'
import {
  GuestCreateSchema,
  GuestDeleteSchema,
  GuestStatusUpdateSchema,
} from '@/schemas/form'
import { GetGuestsParams } from '@/schemas/params'
import { getErrorMessage } from '../helper'

export async function getGuests({
  searchParams,
}: {
  searchParams?: z.infer<typeof GetGuestsParams>
}) {
  const validatedParams = GetGuestsParams.safeParse(searchParams)

  if (!validatedParams.success) return []

  try {
    return await prismaClient.guest.findMany({
      where: { eventId: validatedParams.data.eventId },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error retrieving guests:', error)
    return []
  }
}

export async function createGuest(formData: z.infer<typeof GuestCreateSchema>) {
  const validatedFields = GuestCreateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { eventId, name, phone } = validatedFields.data

  try {
    const guest = await prismaClient.guest.create({
      data: { eventId, name, phone },
    })

    revalidatePath('/invitados')
    return { guestId: guest.id }
  } catch (error) {
    console.error('Error creating guest:', error)
    return { error: getErrorMessage(error) }
  }
}

// Deliberately no session check — called from the public RSVP page too.
export async function updateGuestStatus(
  formData: z.infer<typeof GuestStatusUpdateSchema>
) {
  const validatedFields = GuestStatusUpdateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { guestId, status } = validatedFields.data

  try {
    const guest = await prismaClient.guest.update({
      where: { id: guestId },
      data: { status, respondedAt: new Date() },
    })

    revalidatePath('/invitados')
    return { guest }
  } catch (error) {
    console.error('Error updating guest status:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function deleteGuest(formData: z.infer<typeof GuestDeleteSchema>) {
  const validatedFields = GuestDeleteSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  try {
    await prismaClient.guest.delete({
      where: { id: validatedFields.data.guestId },
    })

    revalidatePath('/invitados')
    return { success: true }
  } catch (error) {
    console.error('Error deleting guest:', error)
    return { error: getErrorMessage(error) }
  }
}
