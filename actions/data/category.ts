'use server'

import type { EventType } from '@prisma/client'
import prismaClient from '@/prisma/client'

async function findAllCategories() {
  try {
    return await prismaClient.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  } catch (error) {
    console.error('Error retrieving categories:', error)
    return null
  }
}

export async function getCategories(eventType?: EventType) {
  const categories = await findAllCategories()
  if (!categories) return []
  if (!eventType) return categories

  const scoped = categories.filter(category =>
    category.eventTypes.includes(eventType)
  )
  return scoped.length ? scoped : categories
}

export async function getCategoryIdsForEventType(eventType: EventType) {
  const categories = await findAllCategories()
  if (!categories) return null
  if (categories.some(category => category.eventTypes.length === 0)) return null

  const scoped = categories.filter(category =>
    category.eventTypes.includes(eventType)
  )
  return scoped.length ? scoped.map(category => category.id) : null
}
