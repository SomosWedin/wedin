'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import { AdminGiftCreateSchema, AdminGiftEditSchema } from '@/schemas/form'
import { GetGiftsParams } from '@/schemas/params'
import { getErrorMessage } from '../helper'
import {
  catalogGiftContentChanged,
  copyCatalogGiftForWishlistLinks,
} from './catalog-gift-copy'
import { getCategories } from './category'
import { createGiftRecord, updateGiftRecord } from './gift-operations'
import {
  GiftlistSelectionError,
  validateGiftlistIds,
} from './giftlist-operations'

const INVALID_GIFT_DATA_ERROR = 'Datos inválidos, por favor verifica tus datos.'

type AdminGiftCreateValues = z.infer<typeof AdminGiftCreateSchema>
type AdminGiftEditValues = z.infer<typeof AdminGiftEditSchema>

export async function getGifts({
  searchParams,
  eventTypeId,
}: {
  searchParams?: z.infer<typeof GetGiftsParams>
  eventTypeId?: string
}) {
  const validatedParams = GetGiftsParams.safeParse(searchParams)

  if (!validatedParams.success) return []

  const { category, giftlistId, name, page, itemsPerPage, sort } =
    validatedParams.data
  const query: Prisma.GiftWhereInput = { isDefault: true }

  if (name) {
    query.name = {
      contains: name.trim(),
      mode: 'insensitive',
    }
  }

  const allowedCategoryIds = eventTypeId
    ? (await getCategories(eventTypeId)).map(allowed => allowed.id)
    : []

  if (eventTypeId && allowedCategoryIds.length === 0) return []
  if (eventTypeId && category && !allowedCategoryIds.includes(category)) {
    return []
  }

  if (eventTypeId) {
    query.categoryId = category ? category : { in: allowedCategoryIds }
  } else if (category) {
    query.categoryId = category
  }

  if (giftlistId) {
    query.giftlistIds = { has: giftlistId }
  }

  const skip =
    page && itemsPerPage ? (Number(page) - 1) * itemsPerPage : undefined
  const take = itemsPerPage ? Number(itemsPerPage) : undefined

  try {
    // Gift.price is a String field, so numeric sorting can't be done via
    // Prisma's `orderBy` (it would sort lexicographically) — fetch, sort in
    // JS, then apply pagination manually.
    if (sort) {
      const gifts = await prismaClient.gift.findMany({
        where: query,
        include: { image: true },
      })

      gifts.sort((a, b) =>
        sort === 'price-asc'
          ? Number(a.price) - Number(b.price)
          : Number(b.price) - Number(a.price)
      )

      return skip !== undefined && take !== undefined
        ? gifts.slice(skip, skip + take)
        : gifts
    }

    return await prismaClient.gift.findMany({
      where: query,
      include: { image: true },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    })
  } catch (error) {
    console.error('Error retrieving gifts:', error)
    return []
  }
}

export async function createAdminGift(formData: AdminGiftCreateValues) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    return { error: 'No autorizado.' }
  }

  const validatedFields = AdminGiftCreateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  const { giftlistIds, ...values } = validatedFields.data

  try {
    const newGift = await prismaClient.$transaction(async tx => {
      const validatedGiftlistIds = await validateGiftlistIds(tx, {
        categoryId: values.categoryId,
        giftlistIds,
      })

      return createGiftRecord(
        tx,
        { ...values, isDefault: true, eventId: undefined },
        validatedGiftlistIds
      )
    })

    if (!newGift) {
      return { error: 'Error al crear regalo' }
    }

    revalidatePath('/gifts')
    return { giftId: newGift.id }
  } catch (error) {
    if (error instanceof GiftlistSelectionError) {
      return { error: error.message }
    }

    console.error('Error creating default gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function editAdminGift(
  formData: AdminGiftEditValues,
  giftId: string
) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    return { error: 'No autorizado.' }
  }

  const validatedFields = AdminGiftEditSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  const { giftlistIds, ...values } = validatedFields.data

  try {
    const result = await prismaClient.$transaction(async tx => {
      const existingGift = await tx.gift.findFirst({
        where: { id: giftId, isDefault: true },
        select: {
          id: true,
          name: true,
          price: true,
          categoryId: true,
          giftlistIds: true,
          image: { select: { url: true } },
          wishlistGifts: { select: { id: true, eventId: true } },
        },
      })

      if (!existingGift) return null

      const validatedGiftlistIds = await validateGiftlistIds(tx, {
        categoryId: values.categoryId,
        giftlistIds,
      })

      const catalogFieldsChanged = catalogGiftContentChanged(
        existingGift,
        values
      )

      if (catalogFieldsChanged) {
        await copyCatalogGiftForWishlistLinks(tx, existingGift)
      }

      const gift = await updateGiftRecord(
        tx,
        giftId,
        values,
        validatedGiftlistIds
      )

      return {
        gift,
      }
    })

    if (!result) return { error: 'Regalo no encontrado.' }

    revalidatePath('/admin')
    revalidatePath('/gifts')
    revalidatePath('/wishlist')
    revalidatePath('/dashboard')
    return { giftId: result.gift.id }
  } catch (error) {
    if (error instanceof GiftlistSelectionError) {
      return { error: error.message }
    }

    console.error('Error editing default gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function deleteDefaultGiftAsAdmin(giftId: string) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    return { error: 'No autorizado.' }
  }

  try {
    const deleted = await prismaClient.$transaction(async tx => {
      const gift = await tx.gift.findFirst({
        where: { id: giftId, isDefault: true },
        select: {
          id: true,
          name: true,
          price: true,
          categoryId: true,
          giftlistIds: true,
          image: { select: { url: true } },
          wishlistGifts: { select: { id: true, eventId: true } },
        },
      })

      if (!gift) return false

      await copyCatalogGiftForWishlistLinks(tx, gift)

      await tx.image.deleteMany({ where: { giftId } })
      await tx.gift.delete({ where: { id: giftId } })
      return true
    })

    if (!deleted) return { error: 'Regalo no encontrado.' }

    revalidatePath('/admin')
    revalidatePath('/gifts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting default gift:', error)
    return { error: getErrorMessage(error) }
  }
}
