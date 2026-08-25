'use server'

import {
  type Event,
  type Image as ImageModel,
  Prisma,
  PrismaClient,
  type User,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/get-current-user'
import type { ErrorResponse } from '@/auth'
import { EventUrlFormSchema } from '@/schemas/form'

const prismaClient = new PrismaClient()

export const getEvent = async (): Promise<
  | (Event & {
      images: ImageModel[]
      users: User[]
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

export const getEventById = async (
  eventId: string
): Promise<Event | ErrorResponse> => {
  try {
    const event = await prismaClient.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return {
        error: 'Event not found',
      }
    }

    return event
  } catch (error) {
    console.error('Error getting event by ID:', error)
    return {
      error: 'Error getting event by ID',
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
      where: { id: eventId },
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
    const existingEvent = await prismaClient.event.findUnique({
      where: { url: normalizedUrl },
    })

    if (existingEvent && existingEvent.id !== eventId) {
      return {
        error: 'Esa dirección ya está en uso, elegí otra.',
      }
    }

    const updatedEvent = await prismaClient.event.update({
      where: { id: eventId },
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
    const updatedEvent = await prismaClient.event.update({
      where: { id: eventId },
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

export const getAllEvents = async (): Promise<Event[] | ErrorResponse> => {
  try {
    const events = await prismaClient.event.findMany()

    return events
  } catch (error) {
    console.error('Error getting all events:', error)
    return {
      error: 'Error getting all events',
    }
  }
}
