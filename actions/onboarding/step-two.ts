'use server';

import { auth } from '@/auth';
import prismaClient from '@/prisma/client';
import { StepTwoSchema } from '@/schemas/onboarding';
import type * as z from 'zod';

export const stepTwo = async (values: z.infer<typeof StepTwoSchema>) => {
  const validatedFields = StepTwoSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' };
  }

  const { partnerName, partnerLastName, name, lastName } = validatedFields.data;

  const session = await auth();

  if (!session?.user?.email) return { error: 'Error obteniendo tu sesión' };

  try {
    await prismaClient.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        name: name,
        lastName: lastName,
        onboardingStep: 3,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }

  if (partnerName && partnerLastName) {
    try {
      await prismaClient.event.update({
        where: {
          primaryUserId: session.user.id,
        },
        data: {
          partnerName: partnerName + ' ' + partnerLastName,
        },
      });
    } catch (error) {
      console.error(error);
      return { error: 'Error actualizando tu evento' };
    }
  }
};
