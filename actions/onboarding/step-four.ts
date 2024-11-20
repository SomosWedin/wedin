'use server';

import { auth } from '@/auth';
import prismaClient from '@/prisma/client';
import { StepFourSchema } from '@/schemas/onboarding';
import { revalidatePath } from 'next/cache';
import type * as z from 'zod';

export const stepFour = async (values: z.infer<typeof StepFourSchema>) => {
  const validatedFields = StepFourSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' };
  }

  const { eventDate } = validatedFields.data;

  const session = await auth();

  if (!session?.user?.email) return { error: 'Error obteniendo tu sesión' };

  try {
    await prismaClient.event.update({
      where: {
        id: session.user.eventId,
      },
      data: {
        date: eventDate,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu evento' };
  }

  try {
    await prismaClient.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        onboardingStep: 5,
        isOnboarded: true,
      },
    });
    revalidatePath('/onboarding');
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }
};
