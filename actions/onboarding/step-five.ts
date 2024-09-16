'use server';

import { auth } from '@/lib/auth';
import prismaClient from '@/prisma/client';

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
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }
};
