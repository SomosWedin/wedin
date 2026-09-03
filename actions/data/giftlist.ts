'use server'

import type { Giftlist, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import { deriveGiftlistEventTypeIds } from '@/lib/giftlist-event-types'
import prismaClient from '@/prisma/client'
import { AdminGiftlistSchema } from '@/schemas/form'
import type { GetGiftlistsSearchParams } from '@/schemas/params'
import { getErrorMessage } from '../helper'
import {
  GiftlistGiftSelectionError,
  validateCatalogGiftIds,
} from './giftlist-operations'

export type GiftlistOption = Pick<Giftlist, 'id' | 'name'> & {
  eventTypeIds: string[]
  gifts: { id: string; eventTypeIds: string[] }[]
}

export type AdminGiftlist = Pick<
  Giftlist,
  'id' | 'name' | 'normalizedName' | 'giftIds'
> & {
  gifts: { id: string; categoryId: string }[]
  eventTypeIds: string[]
  eventTypes: { id: string; name: string }[]
}

export async function getGiftlistOptionsForAdmin(): Promise<GiftlistOption[]> {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') return []

  try {
    const giftlists = await prismaClient.giftlist.findMany({
      select: {
        id: true,
        name: true,
        gifts: {
          select: {
            id: true,
            category: { select: { eventTypeIds: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return giftlists.map(({ gifts, ...giftlist }) => ({
      ...giftlist,
      eventTypeIds: deriveGiftlistEventTypeIds(gifts),
      gifts: gifts.map(gift => ({
        id: gift.id,
        eventTypeIds: gift.category.eventTypeIds,
      })),
    }))
  } catch (error) {
    console.error('Error retrieving gift list options:', error)
    return []
  }
}

export async function getAdminGiftlists() {
  if (!(await ensureAdmin())) return []

  try {
    const giftlists = await prismaClient.giftlist.findMany({
      select: {
        id: true,
        name: true,
        normalizedName: true,
        giftIds: true,
        gifts: {
          select: {
            id: true,
            categoryId: true,
            category: {
              select: {
                eventTypeIds: true,
                eventTypes: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return giftlists.map(giftlist => {
      const eventTypeIds = deriveGiftlistEventTypeIds(giftlist.gifts)
      const eventTypesById = new Map(
        giftlist.gifts.flatMap(gift =>
          gift.category.eventTypes.map(eventType => [eventType.id, eventType])
        )
      )

      return {
        id: giftlist.id,
        name: giftlist.name,
        normalizedName: giftlist.normalizedName,
        giftIds: giftlist.giftIds,
        gifts: giftlist.gifts.map(({ id, categoryId }) => ({ id, categoryId })),
        eventTypeIds,
        eventTypes: eventTypeIds.flatMap(id => {
          const eventType = eventTypesById.get(id)
          return eventType ? [eventType] : []
        }),
      } satisfies AdminGiftlist
    })
  } catch (error) {
    console.error('Error retrieving admin gift lists:', error)
    return []
  }
}

export async function getGiftlist(giftlistId: string, eventTypeId: string) {
  try {
    const giftlist = await prismaClient.giftlist.findFirst({
      include: {
        gifts: {
          include: {
            image: true,
            category: { select: { eventTypeIds: true, name: true } },
          },
        },
      },
      where: { id: giftlistId },
    })

    if (
      !giftlist ||
      giftlist.gifts.length === 0 ||
      !deriveGiftlistEventTypeIds(giftlist.gifts).includes(eventTypeId)
    )
      return null

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

  if (category) {
    query.gifts = { some: { categoryId: category } }
  }

  try {
    const giftlists = await prismaClient.giftlist.findMany({
      where: query,
      include: {
        gifts: {
          include: {
            image: true,
            category: { select: { eventTypeIds: true } },
          },
        },
      },
    })

    if (!eventTypeId) return giftlists

    return giftlists.filter(
      giftlist =>
        giftlist.gifts.length > 0 &&
        deriveGiftlistEventTypeIds(giftlist.gifts).includes(eventTypeId)
    )
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

export async function createAdminGiftlist(formData: unknown) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  const parsed = AdminGiftlistSchema.safeParse(formData)
  if (!parsed.success) return { error: 'Datos inválidos.' }
  try {
    const giftlist = await prismaClient.$transaction(async tx => {
      const giftIds = await validateCatalogGiftIds(tx, parsed.data.giftIds)

      return tx.giftlist.create({
        data: {
          name: parsed.data.name,
          normalizedName: parsed.data.name.toLocaleLowerCase('es-PY'),
          gifts: { connect: giftIds.map(id => ({ id })) },
        },
      })
    })
    revalidateGiftlistPaths()
    return { giftlistId: giftlist.id }
  } catch (error) {
    if (error instanceof GiftlistGiftSelectionError) {
      return { error: error.message }
    }
    return { error: getErrorMessage(error) }
  }
}

export async function editAdminGiftlist(giftlistId: string, formData: unknown) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  const parsed = AdminGiftlistSchema.safeParse(formData)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  try {
    const giftlist = await prismaClient.$transaction(async tx => {
      const existing = await tx.giftlist.findUnique({
        where: { id: giftlistId },
        select: { id: true },
      })
      if (!existing) return null

      const giftIds = await validateCatalogGiftIds(tx, parsed.data.giftIds)

      return tx.giftlist.update({
        where: { id: giftlistId },
        data: {
          name: parsed.data.name,
          normalizedName: parsed.data.name.toLocaleLowerCase('es-PY'),
          gifts: { set: giftIds.map(id => ({ id })) },
        },
      })
    })
    if (!giftlist) return { error: 'Colección no encontrada.' }
    revalidateGiftlistPaths()
    return { giftlistId: giftlist.id }
  } catch (error) {
    if (error instanceof GiftlistGiftSelectionError) {
      return { error: error.message }
    }
    return { error: getErrorMessage(error) }
  }
}

export async function deleteAdminGiftlist(giftlistId: string) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  try {
    await prismaClient.$transaction(async tx => {
      await tx.giftlist.update({
        where: { id: giftlistId },
        data: { gifts: { set: [] } },
      })
      await tx.giftlist.delete({ where: { id: giftlistId } })
    })
    revalidateGiftlistPaths()
    return { success: true }
  } catch (error) {
    return { error: getErrorMessage(error) }
  }
}
