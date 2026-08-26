'use server'

import type { EventType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import prismaClient from '@/prisma/client'
import {
  GiftCreateSchema,
  GiftEditSchema,
  type GiftPostSchema,
} from '@/schemas/form'
import { GetGiftsParams } from '@/schemas/params'
import { getErrorMessage } from '../helper'
import { getCategoryIdsForEventType } from './category'

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
    ? await getCategoryIdsForEventType(eventType)
    : null

  if (allowedCategoryIds) {
    query.categoryId = {
      in: category
        ? allowedCategoryIds.filter(id => id === category)
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

// export async function updateGiftImageUrl(
//   url: string | null | undefined,
//   giftId: string
// ) {
//   try {
//     await prismaClient.gift.update({
//       where: { id: giftId },
//       data: { imageUrl: url },
//     });

//     revalidatePath('/dashboard');
//   } catch (error) {
//     console.error('Error updating gift image URL:', error);
//     return { error: 'Error al agregar la imagen' };
//   }
// }

class PriceLockedError extends Error {}

async function assertPriceEditAllowed(
  wishlistGiftId: string,
  tx: Prisma.TransactionClient | typeof prismaClient
) {
  const wishlistGift = await tx.wishlistGift.findUnique({
    where: { id: wishlistGiftId },
    select: { isGroupGift: true, reservedQuantity: true },
  })

  if (
    wishlistGift &&
    !wishlistGift.isGroupGift &&
    wishlistGift.reservedQuantity > 0
  ) {
    throw new PriceLockedError()
  }
}

export async function editGift(
  formData: z.infer<typeof GiftPostSchema>,
  giftId: string,
  wishlistGiftId: string
) {
  const validatedFields = GiftEditSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { imageUrl, ...giftData } = validatedFields.data

  try {
    const gift = await prismaClient.$transaction(async tx => {
      const currentGift = await tx.gift.findUnique({
        where: { id: giftId },
        select: { price: true },
      })

      if (currentGift && giftData.price !== currentGift.price) {
        await assertPriceEditAllowed(wishlistGiftId, tx)
      }

      return tx.gift.update({
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
  formData: z.infer<typeof GiftPostSchema>,
  wishlistGiftId?: string
) {
  const validatedFields = GiftCreateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { imageUrl, sourceGiftId, ...giftData } = validatedFields.data

  try {
    if (sourceGiftId && wishlistGiftId) {
      const sourceGift = await prismaClient.gift.findUnique({
        where: { id: sourceGiftId },
        select: { price: true },
      })

      if (sourceGift && giftData.price !== sourceGift.price) {
        await assertPriceEditAllowed(wishlistGiftId, prismaClient)
      }
    }

    const newGift = await prismaClient.gift.create({
      data: {
        ...giftData,
        ...(sourceGiftId ? { sourceGiftId } : {}),
        ...(imageUrl ? { image: { create: { url: imageUrl } } } : {}),
      },
    })

    if (!newGift) {
      return { error: 'Error al crear regalo' }
    }

    revalidatePath('/dashboard')
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
