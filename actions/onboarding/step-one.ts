'use server';

import { auth } from '@/lib/auth';
import prismaClient from '@/prisma/client';
import type { Wishlist, EventType } from '@prisma/client';

export const stepOne = async (values: EventType) => {
  let wishlist: Wishlist;

  const session = await auth();

  if (!session?.user?.email || !session.user.id) return { error: 'Error obteniendo tu sesión' };

  try {
    wishlist = await prismaClient.wishlist.create({
      data: {},
    });
    await prismaClient.event.create({
      data: {
        eventType: values,
        wishlistId: wishlist.id,
        primaryUserId: session.user.id,
      },
    });
  } catch (error) {
    console.error('Error creating wishlist or event:', error);
    return { error: 'Error actualizando tu perfil' };
  }

  try {
    await prismaClient.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        onboardingStep: 2,
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { error: 'Error actualizando tu perfil' };
  }

  return { success: true };
};