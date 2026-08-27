'use server'

import type { EventType } from '@prisma/client'
import prismaClient from '@/prisma/client'

export async function getCategories(eventType?: EventType) {
  try {
    const categories = await prismaClient.category.findMany({
      orderBy: { name: 'asc' },
    })

    if (!eventType) return categories
    if (categories.some(category => category.eventType === null)) {
      return categories
    }

    const scoped = categories.filter(
      category => category.eventType === eventType
    )
    return scoped.length ? scoped : categories
  } catch (error) {
    console.error('Error retrieving categories:', error)
    return []
  }
}
