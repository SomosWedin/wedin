'use server'

import { type Event, UserType, type Wishlist } from '@prisma/client'
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

export const updateEventTypeStepOne = async (eventTypeId: string) => {
  const session = await auth()

  let wishlist: Wishlist
  let event: Event

  if (!session?.user?.id) return { error: 'Error obteniendo tu sesión' }

  const eventType = await prismaClient.eventType.findUnique({
    where: { id: eventTypeId },
    select: { id: true },
  })
  if (!eventType) return { error: 'El tipo de evento seleccionado no existe.' }

  // Create wishlist and event
  try {
    wishlist = await prismaClient.wishlist.create({
      data: {},
    })

    event = await prismaClient.event.create({
      data: {
        eventTypeId,
        wishlistId: wishlist.id,
      },
    })
  } catch (error) {
    console.error('Error creating wishlist or event:', error)
    return { error: 'Error creando evento' }
  }

  try {
    await prismaClient.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        onboardingStep: 2,
        eventId: event.id,
      },
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return { error: 'Error actualizando perfil del usuario' }
  }

  // Revalidate cache paths after a successful operation
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

  const event = await prismaClient.event.findFirst({
    where: { users: { some: { id: session.user.id } } },
    include: { eventType: true },
  })
  if (!event) return { error: 'Evento no encontrado.' }

  if (
    isWeddingEventType(event.eventType) &&
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
        where: { id: session.user.id },
        data: {
          name,
          lastName,
          onboardingStep: 3,
        },
      })

      // Optionally create a partner's profile if event type is WEDDING
      if (
        isWeddingEventType(event.eventType) &&
        partnerName &&
        partnerLastName
      ) {
        await tx.user.create({
          data: {
            name: partnerName,
            lastName: partnerLastName,
            isOnboarded: true,
            isPrimary: false,
            eventId: session.user.eventId,
            onboardingStep: 5,
            role: UserType.COUPLE,
          },
        })
      }
    })
  } catch (error) {
    console.error('Error updating or creating user:', error)
    return {
      error: 'Error actualizando el perfil o creando el usuario de tu pareja',
    }
  }

  // Revalidate cache paths after a successful operation
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

  const { eventCountry, eventCity } = validatedFields.data

  const session = await auth()

  if (!session?.user?.id || session?.user?.eventId == null) {
    return { error: 'Error obteniendo tu sesión' }
  }

  try {
    await prismaClient.event.update({
      where: {
        id: session.user.eventId,
      },
      data: {
        country: eventCountry,
        city: eventCity,
      },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu evento' }
  }

  try {
    await prismaClient.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        onboardingStep: 4,
      },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu perfil' }
  }

  // Revalidate cache paths after a successful operation
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

  const { eventDate } = validatedFields.data

  const session = await auth()

  if (!session?.user?.id || session?.user?.eventId == null) {
    return { error: 'Error obteniendo tu sesión' }
  }

  try {
    await prismaClient.event.update({
      where: {
        id: session.user.eventId,
      },
      data: {
        date: eventDate,
      },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu evento' }
  }

  try {
    await prismaClient.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        onboardingStep: 5,
      },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu perfil' }
  }

  // Revalidate cache paths after a successful operation
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

  try {
    await prismaClient.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        isOnboarded: true,
      },
    })
  } catch (error) {
    console.error(error)
    return { error: 'Error actualizando tu perfil' }
  }

  return { success: true }
}
