'use server';

import { auth } from '@/auth';
import prismaClient from '@/prisma/client';
import type { Event, Wishlist, EventType } from '@prisma/client';

export const stepOne = async (values: EventType) => {
  let wishlist: Wishlist;
  let event: Event;

  const session = await auth();

  if (!session?.user?.email || !session?.user?.id)
    return { error: 'Error obteniendo tu sesión' };

  try {
    wishlist = await prismaClient.wishlist.create({
      data: {},
    });
    event = await prismaClient.event.create({
      data: {
        eventType: values,
        wishlistId: wishlist.id,
      },
    });
    // TODO: get primary user id from event and pass it to the user update
  } catch (error) {
    console.error('Error creating wishlist or event:', error);
    return { error: 'Error creando evento' };
  }

  try {
    await prismaClient.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        onboardingStep: 2,
        eventId: event.id,
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { error: 'Error actualizando perfil del usuario' };
  }

  return { success: true };
};
