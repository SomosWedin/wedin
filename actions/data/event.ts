'use server';

import type { ErrorResponse } from '@/auth';
import { PrismaClient, Event } from '@prisma/client';
import { getCurrentUser } from '@/actions/get-current-user';

const prismaClient = new PrismaClient();

export const getEvent = async (): Promise<Event | ErrorResponse> => {
  const user = await getCurrentUser();

  if (!user)
    return {
      error: 'User not authenticated',
    };

  const userId = user.id;

  try {
    const event = await prismaClient.event.findUnique({
      where: { primaryUserId: userId },
      include: {
        images: true, 
      },
    });

    if (!event) {
      return {
        error: 'Event not found',
      };
    }

    return event;
  } catch (error) {
    console.error('Error getting event:', error);
    return {
      error: 'Error getting event',
    };
  }
};

export const getEventById = async (
  eventId: string
): Promise<Event | ErrorResponse> => {
  try {
    const event = await prismaClient.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return {
        error: 'Event not found',
      };
    }

    return event;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    return {
      error: 'Error getting event by ID',
    };
  }
};

export const updateEvent = async (
  eventId: string,
  data: Partial<Event>
): Promise<Event | ErrorResponse> => {
  try {
    const updatedEvent = await prismaClient.event.update({
      where: { id: eventId },
      data,
    });

    return updatedEvent;
  } catch (error) {
    console.error('Error updating event:', error);
    return {
      error: 'Error updating event',
    };
  }
};

export const getAllEvents = async (): Promise<Event[] | ErrorResponse> => {
  try {
    const events = await prismaClient.event.findMany();

    return events;
  } catch (error) {
    console.error('Error getting all events:', error);
    return {
      error: 'Error getting all events',
    };
  }
};
