'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import prismaClient from '@/prisma/client'
import {
  WishlistGiftCreateSchema,
  WishlistGiftDeleteSchema,
  WishlistGiftEditSchema,
  WishlistGiftReceivedToggleSchema,
  WishlistGiftsCreateSchema,
} from '@/schemas/form'
import { GetwishlistGiftsParams } from '@/schemas/params'
import { getErrorMessage } from '../helper'

export async function getWishlistGifts({
  searchParams,
}: {
  searchParams?: z.infer<typeof GetwishlistGiftsParams>
}) {
  const validatedParams = GetwishlistGiftsParams.safeParse(searchParams)

  if (!validatedParams.success) return []

  const { wishlistId, name, category, page, itemsPerPage } =
    validatedParams.data
  const query: Prisma.WishlistGiftWhereInput = { wishlistId }

  if (name || category) {
    query.gift = {
      ...(name ? { name: { contains: name.trim(), mode: 'insensitive' } } : {}),
      ...(category ? { categoryId: category } : {}),
    }
  }

  const skip =
    page && itemsPerPage ? (Number(page) - 1) * itemsPerPage : undefined
  const take = itemsPerPage ? Number(itemsPerPage) : undefined

  try {
    return await prismaClient.wishlistGift.findMany({
      where: query,
      include: { gift: { include: { image: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  } catch (error) {
    console.error('Error retrieving wishlist gifts:', error)
    return []
  }
}

export async function getWishlistGift(wishlistId: string, giftId: string) {
  try {
    return await prismaClient.wishlistGift.findFirst({
      where: { wishlistId, giftId, isReceived: false },
    })
  } catch (error) {
    console.error('Error retrieving wishlist gift:', error)
    return null
  }
}

export async function createWishlistGift(
  formData: z.infer<typeof WishlistGiftCreateSchema>
) {
  const validatedFields = WishlistGiftCreateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { wishlistId, giftId, eventId, isFavoriteGift, isGroupGift } =
    validatedFields.data

  const existing = await getWishlistGift(wishlistId, giftId)

  if (existing) {
    return { error: 'Este regalo ya está en tu lista' }
  }

  try {
    const wishlistGift = await prismaClient.wishlistGift.create({
      data: { wishlistId, giftId, eventId, isFavoriteGift, isGroupGift },
    })

    revalidatePath('/wishlist')
    revalidatePath('/gifts')
    return { wishlistGiftId: wishlistGift.id }
  } catch (error) {
    console.error('Error creating wishlist gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function createWishlistGifts(
  formData: z.infer<typeof WishlistGiftsCreateSchema>
) {
  const validatedFields = WishlistGiftsCreateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { wishlistId, giftIds, eventId } = validatedFields.data

  try {
    const existing = await prismaClient.wishlistGift.findMany({
      where: { wishlistId, giftId: { in: giftIds }, isReceived: false },
      select: { giftId: true },
    })
    const existingGiftIds = new Set(
      existing.map(wishlistGift => wishlistGift.giftId)
    )
    const newGiftIds = giftIds.filter(giftId => !existingGiftIds.has(giftId))

    if (newGiftIds.length > 0) {
      await prismaClient.wishlistGift.createMany({
        data: newGiftIds.map(giftId => ({ wishlistId, giftId, eventId })),
      })
    }

    revalidatePath('/wishlist')
    revalidatePath('/gifts')
    return { success: true }
  } catch (error) {
    console.error('Error creating wishlist gifts:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function editWishlistGift(
  formData: z.infer<typeof WishlistGiftEditSchema>
) {
  const validatedFields = WishlistGiftEditSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { wishlistGiftId, giftId, isFavoriteGift, isGroupGift } =
    validatedFields.data

  try {
    const result = await prismaClient.wishlistGift.updateMany({
      where: {
        id: wishlistGiftId,
        transactions: { none: { status: 'COMPLETED' } },
      },
      data: { giftId, isFavoriteGift, isGroupGift },
    })

    if (result.count === 0) {
      return {
        error: 'No se puede editar un regalo que ya tiene contribuciones.',
      }
    }

    revalidatePath('/wishlist')
    return { success: true }
  } catch (error) {
    console.error('Error editing wishlist gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function setWishlistGiftManuallyReceived(
  formData: z.infer<typeof WishlistGiftReceivedToggleSchema>
) {
  const validatedFields = WishlistGiftReceivedToggleSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { wishlistGiftId, isManuallyReceived } = validatedFields.data

  try {
    await prismaClient.wishlistGift.update({
      where: { id: wishlistGiftId },
      data: { isManuallyReceived },
    })

    revalidatePath('/wishlist')
    return { success: true }
  } catch (error) {
    console.error('Error updating wishlist gift received flag:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function deleteWishlistGift(
  formData: z.infer<typeof WishlistGiftDeleteSchema>
) {
  const validatedFields = WishlistGiftDeleteSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { wishlistId, giftId } = validatedFields.data

  try {
    // Transaction.wishlistGiftId is a required relation, so a hard delete
    // fails (P2014) the moment any transaction of any status still
    // references this gift — archive instead of deleting whenever one
    // exists, and only hard-delete when none do.
    const archived = await prismaClient.wishlistGift.updateMany({
      where: { wishlistId, giftId, transactions: { some: {} } },
      data: { isReceived: true },
    })

    if (archived.count === 0) {
      await prismaClient.wishlistGift.deleteMany({
        where: { wishlistId, giftId },
      })
    }

    revalidatePath('/wishlist')
    revalidatePath('/gifts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting wishlist gift:', error)
    return { error: getErrorMessage(error) }
  }
}
