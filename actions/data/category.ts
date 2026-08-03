'use server'

import prismaClient from '@/prisma/client'

export async function getCategories() {
  try {
    return await prismaClient.category.findMany({
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Error retrieving categories:', error)
    return []
  }
}
