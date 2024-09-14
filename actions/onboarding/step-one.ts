'use server';

import { auth } from '@/lib/auth';
import prismaClient from '@/prisma/client';
import type { Wishlist, EventType } from '@prisma/client';
import { getCurrentUser } from '../get-current-user';

export const stepOne = async (values: EventType) => {
  let wishlist: Wishlist;
  
  const session = await auth();
  const currentUser = await getCurrentUser();

  if (!session?.user?.email || !currentUser?.id ) return { error: 'Error obteniendo tu sesión' };

  try {
    wishlist = await prismaClient.wishlist.create({
      data: {},
    });
    await prismaClient.event.create({
      data: {
        eventType: values,
        wishlistId: wishlist.id,
        primaryUserId: currentUser.id,
      },
    });
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
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { error: 'Error actualizando perfil del usuario' };
  }

  return { success: true };
};