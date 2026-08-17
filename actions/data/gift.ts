'use server'

import type { Prisma } from '@prisma/client'
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
}: {
  searchParams?: z.infer<typeof GetGiftsParams>
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

  if (category) {
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

export async function editGift(
  formData: z.infer<typeof GiftPostSchema>,
  giftId: string
) {
  const validatedFields = GiftEditSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { imageUrl, ...giftData } = validatedFields.data

  try {
    const gift = await prismaClient.gift.update({
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

    if (!gift) {
      return { error: 'Error al editar el regalo' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/wishlist')
    return { giftId: gift.id }
  } catch (error) {
    console.error('Error editing gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function createGift(formData: z.infer<typeof GiftPostSchema>) {
  const validatedFields = GiftCreateSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' }
  }

  const { imageUrl, sourceGiftId, ...giftData } = validatedFields.data

  try {
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
    console.error('Error creating gift:', error)
    return { error: getErrorMessage(error) }
  }
}
