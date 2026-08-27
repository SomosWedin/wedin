'use server'

import type { EventType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import { GiftCreateSchema, GiftEditSchema } from '@/schemas/form'
import { GetGiftsParams } from '@/schemas/params'
import {
  assertPriceEditAllowed,
  getErrorMessage,
  PriceLockedError,
} from '../helper'
import { getCategories } from './category'

const INVALID_GIFT_DATA_ERROR = 'Datos inválidos, por favor verifica tus datos.'

type GiftEditValues = z.infer<typeof GiftEditSchema>
type GiftEditor = Pick<Prisma.TransactionClient, 'gift'>

function validateGiftEdit(formData: GiftEditValues) {
  const result = GiftEditSchema.safeParse(formData)
  return result.success ? result.data : null
}

function updateGiftRecord(
  client: GiftEditor,
  giftId: string,
  { imageUrl, ...giftData }: GiftEditValues
) {
  return client.gift.update({
    where: { id: giftId },
    data: {
      ...giftData,
      ...(imageUrl
        ? {
          image: {
            upsert: {
              create: { url: imageUrl },
              update: { url: imageUrl },
            },
          },
        }
        : {}),
    },
  })
}

export async function getGift(giftId: string) {
  try {
    return await prismaClient.gift.findUnique({
      where: { id: giftId },
    })
  } catch (error) {
    console.error('Error retrieving gift:', error)
    return null
  }
}

export async function getGifts({
  searchParams,
  eventType,
}: {
  searchParams?: z.infer<typeof GetGiftsParams>
  eventType?: EventType
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

  if (giftlistId) {
    query.giftlistId = giftlistId
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

export async function editGift(
  formData: GiftEditValues,
  giftId: string,
  wishlistGiftId: string
) {
  const values = validateGiftEdit(formData)

  if (!values) {
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  try {
    const gift = await prismaClient.$transaction(async tx => {
      await assertPriceEditAllowed(wishlistGiftId, values.price, tx)
      return updateGiftRecord(tx, giftId, values)
    })

    if (!gift) {
      return { error: 'Error al editar el regalo' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/wishlist')
    return { giftId: gift.id }
  } catch (error) {
    if (error instanceof PriceLockedError) {
      return {
        error:
          'No se puede cambiar el precio de un regalo individual con unidades reservadas o vendidas.',
      }
    }

    console.error('Error editing gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function createGift(
  formData: z.infer<typeof GiftCreateSchema>,
  wishlistGiftId?: string
) {
  const validatedFields = GiftCreateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { imageUrl, ...giftData } = validatedFields.data

  if (giftData.isDefault) {
    const currentUser = await getCurrentUser()

    if (currentUser?.role !== 'ADMIN') {
      return { error: 'No autorizado.' }
    }
  }

  try {
    if (wishlistGiftId) {
      await assertPriceEditAllowed(wishlistGiftId, giftData.price, prismaClient)
    }

    const newGift = await prismaClient.gift.create({
      data: {
        ...giftData,
        ...(imageUrl ? { image: { create: { url: imageUrl } } } : {}),
      },
    })

    if (!newGift) {
      return { error: 'Error al crear regalo' }
    }

    revalidatePath('/admin')
    revalidatePath('/gifts')
    return { giftId: newGift.id }
  } catch (error) {
    if (error instanceof PriceLockedError) {
      return {
        error:
          'No se puede cambiar el precio de un regalo individual con unidades reservadas o vendidas.',
      }
    }

    console.error('Error creating gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function editDefaultGiftAsAdmin(
  formData: GiftEditValues,
  giftId: string
) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    return { error: 'No autorizado.' }
  }

  const values = validateGiftEdit(formData)

  if (!values) {
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  try {
    const existingGift = await prismaClient.gift.findFirst({
      where: { id: giftId, isDefault: true },
      select: { id: true },
    })

    if (!existingGift) {
      return { error: 'Regalo no encontrado.' }
    }

    const gift = await updateGiftRecord(prismaClient, giftId, values)

    revalidatePath('/admin')
    revalidatePath('/gifts')
    return { giftId: gift.id }
  } catch (error) {
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
          image: { select: { url: true } },
          wishlistGifts: { select: { id: true, eventId: true } },
        },
      })

      if (!gift) return false

      for (const wishlistGift of gift.wishlistGifts) {
        const privateGift = await tx.gift.create({
          data: {
            name: gift.name,
            price: gift.price,
            categoryId: gift.categoryId,
            eventId: wishlistGift.eventId,
            isDefault: false,
            ...(gift.image?.url
              ? { image: { create: { url: gift.image.url } } }
              : {}),
          },
        })

        await tx.wishlistGift.update({
          where: { id: wishlistGift.id },
          data: { giftId: privateGift.id },
        })
      }

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
