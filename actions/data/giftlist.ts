'use server'

import type { EventType, Giftlist, Prisma } from '@prisma/client'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import type { GetGiftlistsSearchParams } from '@/schemas/params'
import { getCategories } from './category'

export type GiftlistOption = Pick<Giftlist, 'id' | 'name' | 'categoryId'>

export async function getGiftlistOptionsForAdmin(): Promise<GiftlistOption[]> {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') return []

  try {
    return await prismaClient.giftlist.findMany({
      select: { id: true, name: true, categoryId: true },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Error retrieving gift list options:', error)
    return []
  }
}

export async function getGiftlist(giftlistId: string) {
  try {
    const giftlist = await prismaClient.giftlist.findUnique({
      include: {
        gifts: { include: { image: true } },
      },
      where: {
        id: giftlistId,
      },
    })

    if (!giftlist) return null

    return giftlist
  } catch (error) {
    console.error('Error retrieving gifts:', error)
    return null
  }
}

export async function getGiftlists({
  searchParams,
  eventType,
}: {
  searchParams?: z.infer<typeof GetGiftlistsSearchParams>
  eventType?: EventType
}) {
  const query: Prisma.GiftlistWhereInput = {}
  const category = searchParams?.category

  if (searchParams?.name) {
    query.name = {
      contains: searchParams.name,
      mode: 'insensitive',
    }
  }

  const allowedCategoryIds = eventType
    ? (await getCategories(eventType)).map(allowed => allowed.id)
    : []

  if (allowedCategoryIds.length) {
    query.categoryId = {
      in:
        category && allowedCategoryIds.includes(category)
          ? [category]
          : allowedCategoryIds,
    }
  } else if (category) {
    query.categoryId = category
  }

  try {
    const giftlists = await prismaClient.giftlist.findMany({
      where: query,
      include: {
        gifts: { include: { image: true } },
      },
    })

    return giftlists
  } catch (error) {
    console.error('Error retrieving gift lists:', error)
    throw new Error('Failed to retrieve gift lists')
  }
}
