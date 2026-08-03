'use server'

import { type Prisma, PrismaClient, type User } from '@prisma/client'
import type { ErrorResponse } from '@/auth'

const prismaClient = new PrismaClient()

export const getUserByEmail = async (
  email: string
): Promise<User | ErrorResponse> => {
  try {
    const currentUser = await prismaClient.user.findUnique({
      where: { email },
    })

    if (currentUser === null) {
      return { error: 'User not found' } // Use return instead of throw to control flow
    }
    return currentUser
  } catch (_error) {
    // console.error('Error getting user by email:', error);
    return { error: 'InternalError' }
  }
}

export const getSecondaryUser = async (
  primaryUserId: string,
  eventId: string
): Promise<User | ErrorResponse> => {
  try {
    const secondaryUser = await prismaClient.user.findFirst({
      where: {
        id: {
          not: primaryUserId,
        },
        eventId: {
          equals: eventId,
        },
      },
    })

    if (!secondaryUser) {
      return { error: 'Secondary event user not found' }
    }

    return secondaryUser
  } catch (_error) {
    return { error: 'Error getting secondary event user' }
  }
}

export const getLoginUserByEmail = async (email: string) => {
  try {
    return await prismaClient.user.findUnique({
      where: { email },
    })
  } catch (_error) {
    return null
  }
}

export const updateVerifiedOn = async (email: string) => {
  try {
    const currentUser = await prismaClient.user.update({
      where: { email: email },
      data: { emailVerified: new Date() },
    })
    return currentUser
  } catch (_error) {
    return null
  }
}

export const updateUserById = async (
  userId: string,
  name?: string,
  lastName?: string,
  email?: string,
  onboardingStep?: number
) => {
  try {
    const data: Prisma.UserUpdateInput = {}

    if (name !== undefined) data.name = name
    if (lastName !== undefined) data.lastName = lastName
    if (email !== undefined) data.email = email
    if (onboardingStep !== undefined) {
      data.onboardingStep = onboardingStep
    }

    const updatedUser = await prismaClient.user.update({
      where: { id: userId },
      data: data,
    })

    return { success: updatedUser }
  } catch (error) {
    console.error('Error updating user:', error)
    return { error: 'Error updating user' }
  }
}

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
    })
  } catch (error) {
    console.error('Error upserting user:', error, provider)
  }
}
