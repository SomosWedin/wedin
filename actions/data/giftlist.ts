'use server'

import type { Giftlist, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import { AdminGiftlistSchema } from '@/schemas/form'
import type { GetGiftlistsSearchParams } from '@/schemas/params'
import { getErrorMessage } from '../helper'

export type GiftlistOption = Pick<Giftlist, 'id' | 'name' | 'eventTypeIds'>

export async function getGiftlistOptionsForAdmin(): Promise<GiftlistOption[]> {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') return []

  try {
    return await prismaClient.giftlist.findMany({
      select: { id: true, name: true, eventTypeIds: true },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Error retrieving gift list options:', error)
    return []
  }
}

export async function getAdminGiftlists() {
  if (!(await ensureAdmin())) return []

  try {
    return await prismaClient.giftlist.findMany({
      include: {
        gifts: { select: { id: true, categoryId: true } },
        eventTypes: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Error retrieving admin gift lists:', error)
    return []
  }
}

export async function getGiftlist(giftlistId: string) {
  try {
    const giftlist = await prismaClient.giftlist.findUnique({
      include: {
        gifts: { include: { image: true } },
        eventTypes: { select: { id: true, name: true } },
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
  eventTypeId,
}: {
  searchParams?: z.infer<typeof GetGiftlistsSearchParams>
  eventTypeId?: string
}) {
  const query: Prisma.GiftlistWhereInput = {}
  const category = searchParams?.category

  if (searchParams?.name) {
    query.name = {
      contains: searchParams.name,
      mode: 'insensitive',
    }
  }

  if (eventTypeId) {
    query.OR = [
      { eventTypeIds: { has: eventTypeId } },
      { eventTypeIds: { isEmpty: true } },
    ]
  }

  if (category) {
    query.gifts = { some: { categoryId: category } }
  }

  try {
    const giftlists = await prismaClient.giftlist.findMany({
      where: query,
      include: {
        gifts: { include: { image: true } },
        eventTypes: { select: { id: true, name: true } },
      },
    })

    return giftlists
  } catch (error) {
    console.error('Error retrieving gift lists:', error)
    throw new Error('Failed to retrieve gift lists')
  }
}

async function ensureAdmin() {
  const currentUser = await getCurrentUser()
  return currentUser?.role === 'ADMIN'
}

function revalidateGiftlistPaths() {
  revalidatePath('/admin')
  revalidatePath('/gifts')
  revalidatePath('/wishlist')
}

async function validateGiftlistEventTypes(
  giftlistId: string,
  eventTypeIds: string[]
) {
  const uniqueIds = Array.from(new Set(eventTypeIds))
  const [giftlist, eventTypes, gifts] = await Promise.all([
    prismaClient.giftlist.findUnique({
      where: { id: giftlistId },
      select: { id: true },
    }),
    prismaClient.eventType.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    }),
    prismaClient.gift.findMany({
      where: { giftlistId },
      select: { categoryId: true },
    }),
  ])

  if (!giftlist) return undefined
  if (eventTypes.length !== uniqueIds.length) return null
  if (gifts.length === 0) return uniqueIds.length === 0 ? uniqueIds : false

  const categoryIds = Array.from(new Set(gifts.map(gift => gift.categoryId)))
  const categories = await prismaClient.category.findMany({
    where: {
      id: { in: categoryIds },
    },
    select: { eventTypeIds: true },
  })

  return (
    categories.length === categoryIds.length &&
    categories.every(category =>
      uniqueIds.every(eventTypeId =>
        category.eventTypeIds.includes(eventTypeId)
      )
    )
  )
}

export async function createAdminGiftlist(formData: unknown) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  const parsed = AdminGiftlistSchema.safeParse(formData)
  if (!parsed.success) return { error: 'Datos inválidos.' }
  if (parsed.data.eventTypeIds.length > 0) {
    return { error: 'Una colección vacía no puede tener tipos de evento.' }
  }

  try {
    const normalizedName = parsed.data.name.toLocaleLowerCase('es-PY')
    const giftlist = await prismaClient.giftlist.create({
      data: { name: parsed.data.name, normalizedName },
    })
    revalidateGiftlistPaths()
    return { giftlistId: giftlist.id }
  } catch (error) {
    return { error: getErrorMessage(error) }
  }
}

export async function editAdminGiftlist(giftlistId: string, formData: unknown) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  const parsed = AdminGiftlistSchema.safeParse(formData)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const compatible = await validateGiftlistEventTypes(
    giftlistId,
    parsed.data.eventTypeIds
  )
  if (compatible === undefined) return { error: 'Colección no encontrada.' }
  if (compatible === null)
    return { error: 'El tipo de evento seleccionado no existe.' }
  if (!compatible) {
    return {
      error:
        'Los tipos de evento elegidos no son compatibles con las categorías de todos los regalos de esta colección.',
    }
  }

  try {
    const giftlist = await prismaClient.giftlist.update({
      where: { id: giftlistId },
      data: {
        name: parsed.data.name,
        normalizedName: parsed.data.name.toLocaleLowerCase('es-PY'),
        eventTypes: {
          set: Array.from(new Set(parsed.data.eventTypeIds)).map(id => ({
            id,
          })),
        },
      },
    })
    revalidateGiftlistPaths()
    return { giftlistId: giftlist.id }
  } catch (error) {
    return { error: getErrorMessage(error) }
  }
}

export async function deleteAdminGiftlist(giftlistId: string) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  try {
    await prismaClient.$transaction(async tx => {
      await tx.gift.updateMany({
        where: { giftlistId },
        data: { giftlistId: null },
      })
      await tx.giftlist.update({
        where: { id: giftlistId },
        data: { eventTypes: { set: [] } },
      })
      await tx.giftlist.delete({ where: { id: giftlistId } })
    })
    revalidateGiftlistPaths()
    return { success: true }
  } catch (error) {
    return { error: getErrorMessage(error) }
  }
}
