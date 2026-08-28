'use server'

import prismaClient from '@/prisma/client'

export async function getEventTypes() {
  try {
    return await prismaClient.eventType.findMany({ orderBy: { name: 'asc' } })
  } catch (error) {
    console.error('Error retrieving event types:', error)
    return []
  }
}
