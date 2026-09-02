'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import { normalizeCategoryName } from '@/lib/category-name'
import { deriveGiftlistEventTypeIds } from '@/lib/giftlist-event-types'
import prismaClient from '@/prisma/client'
import { AdminCategorySchema } from '@/schemas/form'
import { getErrorMessage } from '../helper'

const INVALID_CATEGORY_DATA_ERROR =
  'Datos inválidos, por favor verifica los datos de la categoría.'
const DUPLICATE_CATEGORY_ERROR = 'Ya existe una categoría con ese nombre.'

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}

export async function getCategories(eventTypeId?: string) {
  try {
    const categories = await prismaClient.category.findMany({
      orderBy: { name: 'asc' },
      include: { eventTypes: { select: { id: true, name: true, key: true } } },
    })

    if (!eventTypeId) return categories

    return categories.filter(category =>
      category.eventTypeIds.includes(eventTypeId)
    )
  } catch (error) {
    console.error('Error retrieving categories:', error)
    return []
  }
}

type AdminCategoryValues = z.infer<typeof AdminCategorySchema>

async function ensureAdmin() {
  const currentUser = await getCurrentUser()
  return currentUser?.role === 'ADMIN'
}

async function findDuplicateCategory(
  values: AdminCategoryValues,
  categoryId?: string
) {
  if (values.eventTypeIds.length === 0) return null

  return prismaClient.category.findFirst({
    where: {
      normalizedName: normalizeCategoryName(values.name),
      ...(categoryId ? { id: { not: categoryId } } : {}),
    },
    select: { id: true },
  })
}

async function validateEventTypeIds(eventTypeIds: string[]) {
  const uniqueIds = Array.from(new Set(eventTypeIds))
  const eventTypes = await prismaClient.eventType.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  })

  return eventTypes.length === uniqueIds.length ? uniqueIds : null
}

async function disconnectCategoryGiftsFromIncompatibleGiftlists(
  tx: Prisma.TransactionClient,
  categoryId: string,
  nextEventTypeIds: string[]
) {
  const giftlists = await tx.giftlist.findMany({
    where: { gifts: { some: { categoryId } } },
    select: {
      id: true,
      name: true,
      gifts: {
        select: {
          id: true,
          categoryId: true,
          category: { select: { eventTypeIds: true } },
        },
      },
    },
  })
  const incompatibleGiftlists = giftlists.filter(giftlist => {
    const prospectiveGifts = giftlist.gifts.map(gift => ({
      category: {
        eventTypeIds:
          gift.categoryId === categoryId
            ? nextEventTypeIds
            : gift.category.eventTypeIds,
      },
    }))

    return deriveGiftlistEventTypeIds(prospectiveGifts).length === 0
  })

  for (const giftlist of incompatibleGiftlists) {
    const affectedGiftIds = giftlist.gifts
      .filter(gift => gift.categoryId === categoryId)
      .map(gift => gift.id)

    for (const giftId of affectedGiftIds) {
      await tx.gift.update({
        where: { id: giftId },
        data: { giftlists: { disconnect: [{ id: giftlist.id }] } },
      })
    }
  }

  return incompatibleGiftlists.map(giftlist => ({
    id: giftlist.id,
    name: giftlist.name,
  }))
}

export async function createAdminCategory(formData: unknown) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  const parsed = AdminCategorySchema.safeParse(formData)
  if (!parsed.success) return { error: INVALID_CATEGORY_DATA_ERROR }

  try {
    const eventTypeIds = await validateEventTypeIds(parsed.data.eventTypeIds)
    if (!eventTypeIds)
      return { error: 'El tipo de evento seleccionado no existe.' }

    const values = { ...parsed.data, eventTypeIds }

    if (await findDuplicateCategory(values)) {
      return { error: DUPLICATE_CATEGORY_ERROR }
    }

    const category = await prismaClient.category.create({
      data: {
        name: values.name,
        normalizedName: normalizeCategoryName(values.name),
        eventTypes: {
          connect: eventTypeIds.map(id => ({ id })),
        },
      },
    })
    revalidatePath('/admin')
    revalidatePath('/gifts')
    return { categoryId: category.id }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: DUPLICATE_CATEGORY_ERROR }
    }
    console.error('Error creating admin category:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function editAdminCategory(categoryId: string, formData: unknown) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  const parsed = AdminCategorySchema.safeParse(formData)
  if (!parsed.success) return { error: INVALID_CATEGORY_DATA_ERROR }

  try {
    const existing = await prismaClient.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, eventTypeIds: true },
    })
    if (!existing) return { error: 'Categoría no encontrada.' }

    const eventTypeIds = await validateEventTypeIds(parsed.data.eventTypeIds)
    if (!eventTypeIds)
      return { error: 'El tipo de evento seleccionado no existe.' }

    const values = { ...parsed.data, eventTypeIds }

    if (await findDuplicateCategory(values, categoryId)) {
      return { error: DUPLICATE_CATEGORY_ERROR }
    }
    const eventTypesChanged =
      [...existing.eventTypeIds].sort().join(',') !==
      [...eventTypeIds].sort().join(',')

    const result = await prismaClient.$transaction(async tx => {
      const removedGiftlists = eventTypesChanged
        ? await disconnectCategoryGiftsFromIncompatibleGiftlists(
            tx,
            categoryId,
            eventTypeIds
          )
        : []

      const updatedCategory = await tx.category.update({
        where: { id: categoryId },
        data: {
          name: values.name,
          normalizedName: normalizeCategoryName(values.name),
          eventTypes: {
            set: eventTypeIds.map(id => ({ id })),
          },
        },
      })
      return { category: updatedCategory, removedGiftlists }
    })
    revalidatePath('/admin')
    revalidatePath('/gifts')
    revalidatePath('/wishlist')
    revalidatePath('/dashboard')
    return {
      categoryId: result.category.id,
      ...(result.removedGiftlists.length > 0
        ? { removedGiftlists: result.removedGiftlists }
        : {}),
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: DUPLICATE_CATEGORY_ERROR }
    }
    console.error('Error editing admin category:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function deleteAdminCategory(categoryId: string) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  try {
    const result = await prismaClient.$transaction(async tx => {
      const giftCount = await tx.gift.count({ where: { categoryId } })
      if (giftCount > 0) return 'in-use' as const

      const category = await tx.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      })
      if (!category) return 'not-found' as const

      await tx.category.update({
        where: { id: categoryId },
        data: { eventTypes: { set: [] } },
      })
      await tx.category.delete({ where: { id: categoryId } })
      return 'deleted' as const
    })

    if (result === 'in-use') {
      return {
        error:
          'No se puede eliminar una categoría que todavía tiene regalos asociados.',
      }
    }
    if (result === 'not-found') return { error: 'Categoría no encontrada.' }

    revalidatePath('/admin')
    revalidatePath('/gifts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting admin category:', error)
    return { error: getErrorMessage(error) }
  }
}
