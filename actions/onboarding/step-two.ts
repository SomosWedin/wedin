// actions/auth/step-one-update.ts
'use server';

import { auth } from '@/lib/auth';
import prismaClient from '@/prisma/client';
import { StepTwoSchema } from '@/schemas/onboarding';
import type { User, Wishlist } from '@prisma/client';
import type * as z from 'zod';

export const stepTwo = async (values: z.infer<typeof StepTwoSchema>) => {
  const validatedFields = StepTwoSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos' };
  }

  const {
    partnerName,
    partnerEmail,
    partnerLastName,
    name,
    lastName,
  } = validatedFields.data;

  let primaryUser: User;
  let secondaryUser: User;
  let wishlist: Wishlist;

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
        email: session.user.email, // This checks if a user exists with this email
      },
      update: {
        name: name,
        lastName: lastName,
      },
      create: {
        email: session.user.email, // Include email in the creation if not exists
        name: name,
        lastName: lastName,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
  }

  try {
    wishlist = await prismaClient.wishlist.create({
      data: {},
    });

    await prismaClient.event.create({
      data: {
        secondaryUserId: secondaryUser.id,
        primaryUserId: primaryUser.id,
        wishlistId: wishlist.id,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: 'Error actualizando tu perfil' };
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
