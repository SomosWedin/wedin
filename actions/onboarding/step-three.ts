'use server';

import { auth } from '@/auth';
import prismaClient from '@/prisma/client';
import { StepThreeSchema } from '@/schemas/onboarding';
import type * as z from 'zod';

export const stepThree = async (values: z.infer<typeof StepThreeSchema>) => {
  const validatedFields = StepThreeSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' };
  }

  const { eventCountry, eventCity } = validatedFields.data;

  const session = await auth();

  if (!session?.user?.email) return { error: 'Error obteniendo tu sesión' };

  try {
    await prismaClient.event.update({
      where: {
        primaryUserId: session.user.id,
      },
      data: {
        country: eventCountry,
        city: eventCity,
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
        onboardingStep: 4,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }
};
