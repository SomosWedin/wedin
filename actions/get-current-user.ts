import { cache } from 'react'
import { auth } from '@/auth'
import prismaClient from '@/prisma/client'

export const getCurrentUser = cache(async () => {
  const session = await auth()

  if (!session?.user?.email) return null

  try {
    return await prismaClient.user.findUnique({
      where: {
        email: session.user.email,
      },
    })
  } catch (error: unknown) {
    console.error(error)
    return null
  }
})
