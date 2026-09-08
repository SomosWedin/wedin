'use server'

import { UserType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type * as z from 'zod'
import { auth } from '@/auth'
import { isWeddingEventType } from '@/lib/event-type'
import prismaClient from '@/prisma/client'
import {
  StepFourSchema,
  StepThreeSchema,
  StepTwoSchema,
} from '@/schemas/onboarding'

// The partner row is created by onboarding without an email. Anything that has
// since been given one may own Account/Session/Payout rows, and Mongo has no
// cascade, so never delete those.
const onboardingPartnerWhere = (eventId: string) => ({
  eventId,
  isPrimary: false,
  email: null,
})

export const updateEventTypeStepOne = async (eventTypeId: string) => {
  const session = await auth()

  if (!session?.user?.id) return { error: 'Error obteniendo tu sesión' }

  const eventType = await prismaClient.eventType.findUnique({
    where: { id: eventTypeId },
    select: { id: true, key: true },
  })
  if (!eventType) return { error: 'El tipo de evento seleccionado no existe.' }

  const user = await prismaClient.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, eventId: true, onboardingStep: true },
  })
  if (!user) return { error: 'Error obteniendo tu perfil' }

  const existingEvent = user.eventId
    ? await prismaClient.event.findUnique({
        where: { id: user.eventId },
        select: { id: true, eventType: { select: { key: true } } },
      })
    : null

  const willBeWedding = isWeddingEventType(eventType)
  const wasWedding = isWeddingEventType(existingEvent?.eventType)

  try {
    await prismaClient.$transaction(async tx => {
      let eventId = existingEvent?.id

      // Coming back to this step must never recreate the event — that would
      // orphan the wishlist and drop everything steps 2-4 collected.
      if (eventId) {
        await tx.event.update({ where: { id: eventId }, data: { eventTypeId } })

        if (wasWedding && !willBeWedding) {
          await tx.user.deleteMany({ where: onboardingPartnerWhere(eventId) })
        }
      } else {
        const wishlist = await tx.wishlist.create({ data: {} })
        const event = await tx.event.create({
          data: { eventTypeId, wishlistId: wishlist.id },
        })
        eventId = event.id
      }

      await tx.user.update({
        where: { id: user.id },
        data: { eventId, onboardingStep: Math.max(user.onboardingStep, 2) },
      })
    })
  } catch (error) {
    console.error('Error saving the event type:', error)
    return { error: 'Error creando evento' }
  }

  try {
    revalidatePath('/onboarding')
  } catch (revalidationError) {
    console.error('Error revalidating cache:', revalidationError)
  }

  return { success: true }
}

export const updateProfileStepTwo = async (
  values: z.infer<typeof StepTwoSchema>
) => {
  const validatedFields = StepTwoSchema.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' }
  }

  const { partnerName, partnerLastName, name, lastName } = validatedFields.data

  const session = await auth()

  if (!session?.user?.id) {
    return { error: 'Error obteniendo tu sesión' }
  }

  const user = await prismaClient.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, onboardingStep: true },
  })
  if (!user) return { error: 'Error obteniendo tu perfil' }
  if (user.onboardingStep < 2) {
    return { error: 'Completá los pasos anteriores.' }
  }

  const event = await prismaClient.event.findFirst({
    where: { users: { some: { id: user.id } } },
    include: { eventType: true },
  })
  if (!event) return { error: 'Evento no encontrado.' }

  const isWedding = isWeddingEventType(event.eventType)

  if (
    isWedding &&
    (!partnerName ||
      partnerName.length < 2 ||
      !partnerLastName ||
      partnerLastName.length < 2)
  ) {
    return {
      error: 'Los datos de tu pareja son obligatorios para un casamiento.',
    }
  }

  if (!name || !lastName) {
    return { error: 'Nombre y apellido son obligatorios.' }
  }

  // Update the primary user's profile and optionally create the partner's,
  // atomically — a failure creating the partner must not leave the primary
  // user advanced to step 3 with the partner's name lost.
  try {
    await prismaClient.$transaction(async tx => {
      await tx.user.update({
        where: { id: user.id },
        data: { name, lastName },
      })

      await tx.user.updateMany({
        where: { id: user.id, onboardingStep: { lt: 3 } },
        data: { onboardingStep: 3 },
      })

      if (isWedding && partnerName && partnerLastName) {
        const partner = await tx.user.findFirst({
          where: onboardingPartnerWhere(event.id),
          select: { id: true },
        })

        if (partner) {
          await tx.user.update({
            where: { id: partner.id },
            data: { name: partnerName, lastName: partnerLastName },
          })
        } else {
          await tx.user.create({
            data: {
              name: partnerName,
              lastName: partnerLastName,
              isOnboarded: true,
              isPrimary: false,
              eventId: event.id,
              onboardingStep: 5,
              role: UserType.COUPLE,
            },
          })
        }
      }
    })
  } catch (error) {
    console.error('Error updating or creating user:', error)
    return {
      error: 'Error actualizando el perfil o creando el usuario de tu pareja',
    }
  }

  try {
    revalidatePath('/onboarding')
  } catch (revalidationError) {
    console.error('Error revalidating cache:', revalidationError)
  }

  return { success: true }
}

export const updateEventLocationStepThree = async (
  values: z.infer<typeof StepThreeSchema>
) => {
  const validatedFields = StepThreeSchema.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' }
  }

  const { eventCountry, eventCity, isDecidingEventLocation } =
    validatedFields.data

  const session = await auth()

  if (!session?.user?.id) {
    return { error: 'Error obteniendo tu sesión' }
  }

  const user = await prismaClient.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, eventId: true, onboardingStep: true },
  })
  if (!user?.eventId) return { error: 'Error obteniendo tu sesión' }
  if (user.onboardingStep < 3) {
    return { error: 'Completá los pasos anteriores.' }
  }

  try {
    await prismaClient.event.update({
      where: { id: user.eventId },
      data: {
        // Explicit nulls so revisiting this step can clear a location that was
        // already saved — Prisma would skip an undefined.
        country: isDecidingEventLocation ? null : eventCountry || null,
        city: isDecidingEventLocation ? null : eventCity || null,
      },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu evento' }
  }

  try {
    await prismaClient.user.updateMany({
      where: { id: user.id, onboardingStep: { lt: 4 } },
      data: { onboardingStep: 4 },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu perfil' }
  }

  try {
    revalidatePath('/onboarding')
  } catch (revalidationError) {
    console.error('Error revalidating cache:', revalidationError)
  }

  return { success: true }
}

export const updateEventDateStepFour = async (
  values: z.infer<typeof StepFourSchema>
) => {
  const validatedFields = StepFourSchema.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' }
  }

  const { eventDate, isDecidingEventDate } = validatedFields.data

  const session = await auth()

  if (!session?.user?.id) {
    return { error: 'Error obteniendo tu sesión' }
  }

  const user = await prismaClient.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, eventId: true, onboardingStep: true },
  })
  if (!user?.eventId) return { error: 'Error obteniendo tu sesión' }
  if (user.onboardingStep < 4) {
    return { error: 'Completá los pasos anteriores.' }
  }

  try {
    await prismaClient.event.update({
      where: { id: user.eventId },
      data: { date: isDecidingEventDate ? null : (eventDate ?? null) },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu evento' }
  }

  try {
    await prismaClient.user.updateMany({
      where: { id: user.id, onboardingStep: { lt: 5 } },
      data: { onboardingStep: 5 },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu perfil' }
  }

  try {
    revalidatePath('/onboarding')
  } catch (revalidationError) {
    console.error('Error revalidating cache:', revalidationError)
  }

  return { success: true }
}

export const updateUserOnboardedStepFive = async () => {
  const session = await auth()

  if (!session?.user?.id) return { error: 'Error obteniendo tu sesión' }

  const user = await prismaClient.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, onboardingStep: true },
  })
  if (!user) return { error: 'Error obteniendo tu perfil' }
  if (user.onboardingStep < 5) {
    return { error: 'Completá los pasos anteriores.' }
  }

  try {
    await prismaClient.user.update({
      where: { id: user.id },
      data: { isOnboarded: true },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu perfil' }
  }

  return { success: true }
}
