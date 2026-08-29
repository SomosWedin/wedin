'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import { AdminCategorySchema } from '@/schemas/form'
import { getErrorMessage } from '../helper'
import { copyCatalogGiftForWishlistLinks } from './catalog-gift-copy'

const INVALID_CATEGORY_DATA_ERROR =
  'Datos inválidos, por favor verifica los datos de la categoría.'

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
      name: { equals: values.name, mode: 'insensitive' },
      eventTypeIds: { hasSome: values.eventTypeIds },
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

async function validateGiftlistTypeCompatibility(
  categoryId: string,
  eventTypeIds: string[]
) {
  const gifts = await prismaClient.gift.findMany({
    where: { categoryId, giftlistIds: { isEmpty: false } },
    select: { giftlists: { select: { eventTypeIds: true } } },
  })

  const incompatible = gifts.some(gift =>
    gift.giftlists.some(giftlist =>
      giftlist.eventTypeIds.some(
        eventTypeId => !eventTypeIds.includes(eventTypeId)
      )
    )
  )

  return !incompatible
}

async function preserveWishlistCategoryBeforeEdit(
  tx: Prisma.TransactionClient,
  existing: { id: string; name: string; eventTypeIds: string[] },
  values: AdminCategoryValues
) {
  const nameChanged =
    existing.name.toLocaleLowerCase('es-PY') !==
    values.name.toLocaleLowerCase('es-PY')
  const removedEventTypeIds = existing.eventTypeIds.filter(
    eventTypeId => !values.eventTypeIds.includes(eventTypeId)
  )
  if (!nameChanged && removedEventTypeIds.length === 0) return

  const gifts = await tx.gift.findMany({
    where: {
      categoryId: existing.id,
      wishlistGifts: { some: {} },
    },
    select: {
      id: true,
      name: true,
      price: true,
      categoryId: true,
      isDefault: true,
      image: { select: { url: true } },
      wishlistGifts: {
        select: {
          id: true,
          eventId: true,
          event: { select: { eventTypeId: true } },
        },
      },
    },
  })

  const affectedGifts = gifts
    .map(gift => ({
      gift,
      wishlistGifts: gift.wishlistGifts.filter(
        wishlistGift =>
          nameChanged ||
          removedEventTypeIds.includes(wishlistGift.event.eventTypeId)
      ),
    }))
    .filter(({ wishlistGifts }) => wishlistGifts.length > 0)

  if (affectedGifts.length === 0) return

  const preservedEventTypeIds = nameChanged
    ? existing.eventTypeIds
    : removedEventTypeIds
  const reusableCategory = await tx.category.findFirst({
    where: {
      id: { not: existing.id },
      name: { equals: existing.name, mode: 'insensitive' },
      eventTypeIds: { hasEvery: preservedEventTypeIds },
    },
    select: { id: true },
  })
  const preservedCategory =
    reusableCategory ??
    (await tx.category.create({
      data: {
        name: existing.name,
        eventTypes: {
          connect: preservedEventTypeIds.map(id => ({ id })),
        },
      },
      select: { id: true },
    }))

  for (const { gift, wishlistGifts } of affectedGifts) {
    if (gift.isDefault || wishlistGifts.length < gift.wishlistGifts.length) {
      await copyCatalogGiftForWishlistLinks(
        tx,
        gift,
        preservedCategory.id,
        wishlistGifts
      )
      continue
    }

    await tx.gift.update({
      where: { id: gift.id },
      data: { category: { connect: { id: preservedCategory.id } } },
    })
  }
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
      return {
        error:
          'Ya existe una categoría con ese nombre para ese tipo de evento.',
      }
    }

    const category = await prismaClient.category.create({
      data: {
        name: values.name,
        eventTypes: {
          connect: eventTypeIds.map(id => ({ id })),
        },
      },
    })
    revalidatePath('/admin')
    revalidatePath('/gifts')
    return { categoryId: category.id }
  } catch (error) {
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
      return {
        error:
          'Ya existe una categoría con ese nombre para ese tipo de evento.',
      }
    }

    if (!(await validateGiftlistTypeCompatibility(categoryId, eventTypeIds))) {
      return {
        error:
          'Esta categoría tiene regalos en colecciones que requieren tipos de evento que no seleccionaste.',
      }
    }

    const category = await prismaClient.$transaction(async tx => {
      await preserveWishlistCategoryBeforeEdit(tx, existing, values)

      return tx.category.update({
        where: { id: categoryId },
        data: {
          name: values.name,
          eventTypes: {
            set: eventTypeIds.map(id => ({ id })),
          },
        },
      })
    })
    revalidatePath('/admin')
    revalidatePath('/gifts')
    revalidatePath('/wishlist')
    revalidatePath('/dashboard')
    return { categoryId: category.id }
  } catch (error) {
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
