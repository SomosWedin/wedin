// actions/auth/step-one-update.ts
'use server';

import { auth } from '@/lib/auth';
import prismaClient from '@/prisma/client';
import { StepTwoSchema } from '@/schemas/onboarding';
import type { User } from '@prisma/client';
import type * as z from 'zod';

export const stepTwo = async (values: z.infer<typeof StepTwoSchema>) => {
  const validatedFields = StepTwoSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' };
  }

  const { partnerName, partnerEmail, partnerLastName, name, lastName } = validatedFields.data;

  let primaryUser: User;
  let secondaryUser: User;

  try {
    secondaryUser = await prismaClient.user.create({
      data: {
        email: partnerEmail,
        name: partnerName,
        lastName: partnerLastName,
        isMagicLinkLogin: true,
        isOnboarded: true,
      },
    });
  } catch (error) {
    return { error: 'Error creado el usuario de tu pareja' };
  }

  const session = await auth();

  if (!session?.user?.email) return { error: 'Error obteniendo tu sesión' };

  try {
    primaryUser = await prismaClient.user.upsert({
      where: {
        email: session.user.email,
      },
      update: {
        name: name,
        lastName: lastName,
      },
      create: {
        email: session.user.email,
        name: name,
        lastName: lastName,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }

  try {
    await prismaClient.event.update({
      where: {
        primaryUserId: primaryUser.id,
      },
      data: {
        secondaryUserId: secondaryUser.id,
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
        onboardingStep: 3,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }
};
