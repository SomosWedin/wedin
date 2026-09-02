'use server'

import {
  type Event,
  type Image as ImageModel,
  Prisma,
  type User,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/get-current-user'
import type { ErrorResponse } from '@/auth'
import prismaClient from '@/prisma/client'
import { EventUrlFormSchema } from '@/schemas/form'

async function getOwnedEvent(eventId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  return prismaClient.event.findFirst({
    where: {
      id: eventId,
      users: { some: { id: currentUser.id } },
    },
    select: { id: true },
  })
}

export const getEvent = async (): Promise<
  | (Event & {
      images: ImageModel[]
      users: User[]
      eventType: { id: string; name: string; key: string }
    })
  | ErrorResponse
> => {
  const user = await getCurrentUser()

  if (!user)
    return {
      error: 'User not authenticated',
    }

  const userId = user.id

  try {
    const event = await prismaClient.event.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        images: true,
        users: true,
        eventType: true,
      },
    })

    if (!event) {
      return {
        error: 'Event not found',
      }
    }

    return event
  } catch (error) {
    console.error('Error getting event:', error)
    return {
      error: 'Error getting event',
    }
  }
}

export const updateEvent = async (
  eventId: string,
  data: {
    coverMessage?: string
    date?: Date
    url?: string
  }
) => {
  try {
    const ownedEvent = await getOwnedEvent(eventId)
    if (!ownedEvent) return { error: 'No autorizado.' }

    const updateData: Partial<Event> = {}

    if (data.coverMessage) {
      updateData.coverMessage = data.coverMessage
    }

    if (data.date) {
      updateData.date = data.date
    }

    if (data.url) {
      updateData.url = data.url
    }

    const updatedEvent = await prismaClient.event.update({
      where: { id: ownedEvent.id },
      data: updateData,
    })

    revalidatePath('/event-details')
    revalidatePath('/event-settings')
    revalidatePath('/dashboard')
    return { success: updatedEvent }
  } catch (error) {
    console.error('Error updating event:', error)

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        error: 'Esa dirección ya está en uso, elegí otra.',
      }
    }

    return {
      error: 'No pudimos actualizar tu evento.',
    }
  }
}

export const updateEventUrl = async (eventId: string, url: string) => {
  const validatedFields = EventUrlFormSchema.safeParse({
    eventId,
    eventUrl: url,
  })

  if (!validatedFields.success) {
    return {
      error:
        validatedFields.error.errors[0]?.message ??
        'La dirección de tu evento no es válida',
    }
  }

  const normalizedUrl = validatedFields.data.eventUrl

  try {
    const ownedEvent = await getOwnedEvent(eventId)
    if (!ownedEvent) return { error: 'No autorizado.' }

    const existingEvent = await prismaClient.event.findUnique({
      where: { url: normalizedUrl },
    })

    if (existingEvent && existingEvent.id !== ownedEvent.id) {
      return {
        error: 'Esa dirección ya está en uso, elegí otra.',
      }
    }

    const updatedEvent = await prismaClient.event.update({
      where: { id: ownedEvent.id },
      data: { url: normalizedUrl },
    })

    revalidatePath('/event-settings')
    revalidatePath('/dashboard')
    return { success: updatedEvent }
  } catch (error) {
    console.error('Error updating event url:', error)
    return { error: 'Error actualizando la dirección del evento' }
  }
}

export const setEventPublished = async (
  eventId: string,
  isPublished: boolean
) => {
  try {
    const ownedEvent = await getOwnedEvent(eventId)
    if (!ownedEvent) return { error: 'No autorizado.' }

    const updatedEvent = await prismaClient.event.update({
      where: { id: ownedEvent.id },
      data: { isPublished },
    })

    revalidatePath('/dashboard')
    if (updatedEvent.url) {
      revalidatePath(`/e/${updatedEvent.url}`)
    }

    return { success: updatedEvent }
  } catch (error) {
    console.error('Error updating event published status:', error)
    return { error: 'Error actualizando la visibilidad de tu sitio' }
  }
}
