'use server'

import type { EventType, Prisma } from '@prisma/client'
import prismaClient from '@/prisma/client'

async function findCategories(where?: Prisma.CategoryWhereInput) {
  try {
    return await prismaClient.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  } catch (error) {
    console.error('Error retrieving categories:', error)
    return null
  }
}

export async function getCategories(eventType?: EventType) {
  if (eventType) {
    const scoped = await findCategories({ eventTypes: { has: eventType } })
    if (scoped?.length) return scoped
  }

  return (await findCategories()) ?? []
}

export async function getCategoryIdsForEventType(eventType: EventType) {
  const scoped = await findCategories({ eventTypes: { has: eventType } })
  return scoped?.length ? scoped.map(category => category.id) : null
}
