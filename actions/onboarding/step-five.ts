'use server';

import { auth } from '@/auth';
import prismaClient from '@/prisma/client';
import { revalidatePath } from 'next/cache';

export const stepFive = async () => {
  const session = await auth();

  if (!session?.user?.email) return { error: 'Error obteniendo tu sesión' };

  try {
    await prismaClient.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        isOnboarded: true,
      },
    });
    revalidatePath('/onboarding');
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }
};
