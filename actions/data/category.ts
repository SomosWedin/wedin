'use server'

import type { EventType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import { AdminCategorySchema } from '@/schemas/form'
import { getErrorMessage } from '../helper'

const INVALID_CATEGORY_DATA_ERROR =
  'Datos inválidos, por favor verifica los datos de la categoría.'

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

type AdminCategoryValues = z.infer<typeof AdminCategorySchema>

async function ensureAdmin() {
  const currentUser = await getCurrentUser()
  return currentUser?.role === 'ADMIN'
}

async function findDuplicateCategory(
  values: AdminCategoryValues,
  categoryId?: string
) {
  return prismaClient.category.findFirst({
    where: {
      name: { equals: values.name, mode: 'insensitive' },
      eventType: values.eventType,
      ...(categoryId ? { id: { not: categoryId } } : {}),
    },
    select: { id: true },
  })
}

export async function createAdminCategory(formData: unknown) {
  if (!(await ensureAdmin())) return { error: 'No autorizado.' }

  const parsed = AdminCategorySchema.safeParse(formData)
  if (!parsed.success) return { error: INVALID_CATEGORY_DATA_ERROR }

  try {
    if (await findDuplicateCategory(parsed.data)) {
      return {
        error:
          'Ya existe una categoría con ese nombre para ese tipo de evento.',
      }
    }

    const category = await prismaClient.category.create({ data: parsed.data })
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
      select: { id: true },
    })
    if (!existing) return { error: 'Categoría no encontrada.' }

    if (await findDuplicateCategory(parsed.data, categoryId)) {
      return {
        error:
          'Ya existe una categoría con ese nombre para ese tipo de evento.',
      }
    }

    const category = await prismaClient.category.update({
      where: { id: categoryId },
      data: parsed.data,
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
    const [giftCount, giftlistCount] = await Promise.all([
      prismaClient.gift.count({ where: { categoryId } }),
      prismaClient.giftlist.count({ where: { categoryId } }),
    ])

    if (giftCount > 0 || giftlistCount > 0) {
      return {
        error:
          'No se puede eliminar una categoría que todavía tiene regalos o colecciones asociadas.',
      }
    }

    const deleted = await prismaClient.category.deleteMany({
      where: { id: categoryId },
    })
    if (deleted.count === 0) return { error: 'Categoría no encontrada.' }

    revalidatePath('/admin')
    revalidatePath('/gifts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting admin category:', error)
    return { error: getErrorMessage(error) }
  }
}
