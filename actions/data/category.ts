'use server'

import type { EventType } from '@prisma/client'
import prismaClient from '@/prisma/client'

export async function getCategories(eventType?: EventType) {
  try {
    return await prismaClient.category.findMany({
      where: eventType ? { eventTypes: { has: eventType } } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  } catch (error) {
    console.error('Error retrieving categories:', error)
    return []
  }
}

export async function getCategoryIdsForEventType(eventType: EventType) {
  const categories = await getCategories(eventType)
  return categories.map(category => category.id)
}
