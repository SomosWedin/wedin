'use server';

import type { ErrorResponse } from '@/auth';
import { PrismaClient, User } from '@prisma/client';
const prismaClient = new PrismaClient();

export const getUserByEmail = async (
  email: string
): Promise<any | ErrorResponse> => {
  try {
    const currentUser = await prismaClient.user.findUnique({
      where: { email },
    });

    if (currentUser === null) {
      return { error: 'User not found' }; // Use return instead of throw to control flow
    }
    return currentUser;
  } catch (error) {
    // console.error('Error getting user by email:', error);
    return { error: 'InternalError' };
  }
};

export const getLoginUserByEmail = async (email: string) => {
  try {
    return await prismaClient.user.findUnique({
      where: { email },
    });
  } catch (error) {
    return null;
  }
};

export const updateVerifiedOn = async (email: string) => {
  try {
    const currentUser = await prismaClient.user.update({
      where: { email: email },
      data: { emailVerified: new Date() },
    });
    return currentUser;
  } catch (error) {
    return null;
  }
};

export const updateUserById = async (
  userId: string,
  name?: string,
  lastName?: string,
  onboardingStep?: number
) => {
  try {
    const updateData: Partial<User> = {};

    if (name) {
      updateData.name = name;
    }
    if (lastName) {
      updateData.lastName = lastName;
    }
    if (onboardingStep) {
      updateData.onboardingStep = onboardingStep;
    }

    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { success: updatedUser };
  } catch (error) {
    console.error('Error updating user:', error);
    return { error: 'Error updating user' };
  }
};

export const upsertUser = async (email: string, provider?: string) => {
  try {
    return await prismaClient.user.upsert({
      where: {
        email: email,
      },
      update: {
        email: email,
      },
      create: {
        email: email,
        // provider: provider,
      },
    });
  } catch (error) {
    console.error('Error upserting user:', error, provider);
  }
};