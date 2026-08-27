'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import prismaClient from '@/prisma/client'
import {
  GiftWithWishlistGiftCreateSchema,
  GiftWithWishlistGiftEditSchema,
  WishlistGiftCreateSchema,
  WishlistGiftDeleteSchema,
  type WishlistGiftEditSchema,
  WishlistGiftReceivedToggleSchema,
  WishlistGiftsCreateSchema,
} from '@/schemas/form'
import { GetwishlistGiftsParams } from '@/schemas/params'
import {
  getErrorMessage,
  PriceLockedError,
  retryOnTransientWriteConflict,
  revalidateGiftAndWishlistPaths,
  WishlistGiftMutationError,
} from '../helper'
import { createGiftRecord, updateGiftRecord } from './gift-operations'
import { releaseExpiredHolds } from './reservation'

const MAX_HOLDS_PER_RENDER = 25
const INVALID_GIFT_DATA_ERROR = 'Datos inválidos, por favor verifica tus datos.'

type WishlistGiftWriter = Pick<
  Prisma.TransactionClient,
  'event' | 'gift' | 'wishlistGift'
>
type WishlistGiftCreateValues = z.infer<typeof WishlistGiftCreateSchema>
type WishlistGiftEditValues = z.infer<typeof WishlistGiftEditSchema>
type WishlistGiftProgressUpdate = Pick<
  Prisma.WishlistGiftUpdateManyMutationInput,
  'groupGiftParts' | 'isFullyPaid'
>

async function assertWishlistGiftLinksAllowed(
  client: WishlistGiftWriter,
  {
    eventId,
    giftIds,
    wishlistId,
  }: { eventId: string; giftIds: string[]; wishlistId: string }
) {
  const event = await client.event.findFirst({
    where: { id: eventId, wishlistId },
    select: { id: true },
  })

  if (!event) {
    throw new WishlistGiftMutationError(
      'El evento y la lista de regalos no coinciden.'
    )
  }

  const uniqueGiftIds = Array.from(new Set(giftIds))
  const gifts = await client.gift.findMany({
    where: { id: { in: uniqueGiftIds } },
    select: { id: true, isDefault: true, eventId: true },
  })

  if (gifts.length !== uniqueGiftIds.length) {
    throw new WishlistGiftMutationError('Uno o más regalos no existen.')
  }

  const privateGifts = gifts.filter(gift => !gift.isDefault)
  if (privateGifts.some(gift => gift.eventId !== eventId)) {
    throw new WishlistGiftMutationError(
      'El regalo privado no pertenece a este evento.'
    )
  }

  if (privateGifts.length > 0) {
    const existingPrivateLink = await client.wishlistGift.findFirst({
      where: { giftId: { in: privateGifts.map(gift => gift.id) } },
      select: { id: true },
    })

    if (existingPrivateLink) {
      throw new WishlistGiftMutationError(
        'El regalo privado ya pertenece a una lista de regalos.'
      )
    }
  }

  return uniqueGiftIds
}

async function createWishlistGiftRecord(
  client: WishlistGiftWriter,
  values: WishlistGiftCreateValues
) {
  await assertWishlistGiftLinksAllowed(client, {
    eventId: values.eventId,
    giftIds: [values.giftId],
    wishlistId: values.wishlistId,
  })

  const existing = await client.wishlistGift.findFirst({
    where: {
      wishlistId: values.wishlistId,
      giftId: values.giftId,
      isReceived: false,
    },
    select: { id: true },
  })

  if (existing) {
    throw new WishlistGiftMutationError('Este regalo ya está en tu lista')
  }

  return client.wishlistGift.create({
    data: {
      ...values,
      quantity: values.isGroupGift ? 1 : values.quantity,
    },
  })
}

async function updateWishlistGiftRecord(
  client: WishlistGiftWriter,
  values: WishlistGiftEditValues,
  currentIsGroupGift: boolean,
  progress: WishlistGiftProgressUpdate = {}
) {
  const isChangingType = values.isGroupGift !== currentIsGroupGift
  const result = await client.wishlistGift.updateMany({
    where: {
      id: values.wishlistGiftId,
      reservedQuantity: { lte: values.isGroupGift ? 0 : values.quantity },
      ...(isChangingType ? { reservedAmount: 0 } : {}),
    },
    data: {
      giftId: values.giftId,
      isFavoriteGift: values.isFavoriteGift,
      isGroupGift: values.isGroupGift,
      quantity: values.isGroupGift ? 1 : values.quantity,
      ...progress,
    },
  })

  if (result.count === 0) {
    throw new WishlistGiftMutationError(
      isChangingType
        ? 'No se puede cambiar el tipo de un regalo con contribuciones.'
        : 'La cantidad no puede ser menor a las unidades ya reservadas o vendidas.'
    )
  }

  return result
}

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

  await releaseExpiredHolds({ wishlistId, limit: MAX_HOLDS_PER_RENDER })

  try {
    return await prismaClient.wishlistGift.findMany({
      where: query,
      include: {
        gift: { include: { image: true } },
        transactions: {
          where: { status: 'COMPLETED' },
          select: { quantity: true },
        },
      },
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
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  try {
    const wishlistGift = await retryOnTransientWriteConflict(() =>
      prismaClient.$transaction(tx =>
        createWishlistGiftRecord(tx, validatedFields.data)
      )
    )

    revalidatePath('/wishlist')
    revalidatePath('/gifts')
    return { wishlistGiftId: wishlistGift.id }
  } catch (error) {
    if (error instanceof WishlistGiftMutationError) {
      return { error: error.message }
    }

    console.error('Error creating wishlist gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function createGiftWithWishlistGift(
  formData: z.infer<typeof GiftWithWishlistGiftCreateSchema>
) {
  const validatedFields = GiftWithWishlistGiftCreateSchema.safeParse(formData)

  if (!validatedFields.success || validatedFields.data.gift.isDefault) {
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  try {
    const result = await retryOnTransientWriteConflict(() =>
      prismaClient.$transaction(async tx => {
        const gift = await createGiftRecord(tx, validatedFields.data.gift)
        const wishlistGift = await createWishlistGiftRecord(tx, {
          ...validatedFields.data.wishlistGift,
          giftId: gift.id,
        })

        return { giftId: gift.id, wishlistGiftId: wishlistGift.id }
      })
    )

    revalidateGiftAndWishlistPaths()
    return result
  } catch (error) {
    if (error instanceof WishlistGiftMutationError) {
      return { error: error.message }
    }

    console.error('Error creating gift and wishlist gift:', error)
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
    await retryOnTransientWriteConflict(() =>
      prismaClient.$transaction(async tx => {
        const uniqueGiftIds = await assertWishlistGiftLinksAllowed(tx, {
          eventId,
          giftIds,
          wishlistId,
        })
        const existing = await tx.wishlistGift.findMany({
          where: {
            wishlistId,
            giftId: { in: uniqueGiftIds },
            isReceived: false,
          },
          select: { giftId: true },
        })
        const existingGiftIds = new Set(
          existing.map(wishlistGift => wishlistGift.giftId)
        )
        const newGiftIds = uniqueGiftIds.filter(
          giftId => !existingGiftIds.has(giftId)
        )

        if (newGiftIds.length > 0) {
          await tx.wishlistGift.createMany({
            data: newGiftIds.map(giftId => ({ wishlistId, giftId, eventId })),
          })
        }
      })
    )

    revalidatePath('/wishlist')
    revalidatePath('/gifts')
    return { success: true }
  } catch (error) {
    if (error instanceof WishlistGiftMutationError) {
      return { error: error.message }
    }

    console.error('Error creating wishlist gifts:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function editGiftWithWishlistGift(
  formData: z.infer<typeof GiftWithWishlistGiftEditSchema>
) {
  const validatedFields = GiftWithWishlistGiftEditSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  const { gift: giftValues, wishlistGift: wishlistGiftValues } =
    validatedFields.data

  try {
    const result = await retryOnTransientWriteConflict(() =>
      prismaClient.$transaction(async tx => {
        const current = await tx.wishlistGift.findFirst({
          where: {
            id: wishlistGiftValues.wishlistGiftId,
            wishlistId: wishlistGiftValues.wishlistId,
            event: { wishlistId: wishlistGiftValues.wishlistId },
          },
          select: {
            eventId: true,
            giftId: true,
            isFavoriteGift: true,
            isGroupGift: true,
            quantity: true,
            isFullyPaid: true,
            groupGiftParts: true,
            reservedQuantity: true,
            gift: {
              select: {
                id: true,
                name: true,
                categoryId: true,
                price: true,
                isDefault: true,
                eventId: true,
                image: { select: { url: true } },
                wishlistGifts: { select: { id: true }, take: 2 },
              },
            },
            transactions: {
              where: { status: 'COMPLETED' },
              select: { amount: true, quantity: true },
            },
          },
        })

        if (!current) {
          throw new WishlistGiftMutationError('Regalo no encontrado.')
        }

        if (
          !current.gift.isDefault &&
          current.gift.eventId !== current.eventId
        ) {
          throw new WishlistGiftMutationError(
            'El regalo privado no pertenece a este evento.'
          )
        }

        const giftChanged =
          giftValues.name !== current.gift.name ||
          giftValues.categoryId !== current.gift.categoryId ||
          giftValues.price !== current.gift.price ||
          giftValues.imageUrl !== (current.gift.image?.url ?? '')
        const priceChanged = giftValues.price !== current.gift.price

        if (
          giftChanged &&
          giftValues.price !== current.gift.price &&
          (current.isFullyPaid ||
            current.reservedQuantity > 0 ||
            Number(current.groupGiftParts) > 0 ||
            current.transactions.length > 0)
        ) {
          throw new PriceLockedError()
        }

        let giftId = current.giftId

        if (giftChanged) {
          const mustCreatePrivateCopy =
            current.gift.isDefault || current.gift.wishlistGifts.length > 1
          const gift = mustCreatePrivateCopy
            ? await createGiftRecord(tx, {
                ...giftValues,
                isDefault: false,
                eventId: current.eventId,
              })
            : await updateGiftRecord(
                tx,
                current.giftId,
                giftValues,
                undefined,
                { isDefault: false, eventId: current.eventId }
              )

          giftId = gift.id
        }

        const wishlistSettingsChanged =
          wishlistGiftValues.isFavoriteGift !== current.isFavoriteGift ||
          wishlistGiftValues.isGroupGift !== current.isGroupGift ||
          wishlistGiftValues.quantity !== current.quantity
        const progress =
          wishlistSettingsChanged || !giftChanged || priceChanged
            ? (() => {
                const completedAmount = current.transactions.reduce(
                  (sum, transaction) => sum + (Number(transaction.amount) || 0),
                  0
                )
                const completedQuantity = current.transactions.reduce(
                  (sum, transaction) => sum + transaction.quantity,
                  0
                )

                return wishlistGiftValues.isGroupGift
                  ? {
                      groupGiftParts: String(completedAmount),
                      isFullyPaid:
                        Number(giftValues.price) > 0 &&
                        completedAmount >= Number(giftValues.price),
                    }
                  : {
                      isFullyPaid:
                        completedQuantity >= wishlistGiftValues.quantity,
                    }
              })()
            : {}

        await updateWishlistGiftRecord(
          tx,
          { ...wishlistGiftValues, giftId },
          current.isGroupGift,
          progress
        )

        return { giftId }
      })
    )

    revalidateGiftAndWishlistPaths()
    return result
  } catch (error) {
    if (error instanceof WishlistGiftMutationError) {
      return { error: error.message }
    }

    if (error instanceof PriceLockedError) {
      return {
        error:
          'No se puede cambiar el precio de un regalo que ya tiene contribuciones o pagos.',
      }
    }

    console.error('Error editing gift and wishlist gift:', error)
    return { error: getErrorMessage(error) }
  }
}

export async function editGiftWithWishlistGift(
  formData: z.infer<typeof GiftWithWishlistGiftEditSchema>
) {
  const validatedFields = GiftWithWishlistGiftEditSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: INVALID_GIFT_DATA_ERROR }
  }

  const { gift: giftValues, wishlistGift: wishlistGiftValues } =
    validatedFields.data

  try {
    const result = await retryOnTransientWriteConflict(() =>
      prismaClient.$transaction(async tx => {
        const current = await tx.wishlistGift.findFirst({
          where: {
            id: wishlistGiftValues.wishlistGiftId,
            wishlistId: wishlistGiftValues.wishlistId,
          },
          select: {
            eventId: true,
            giftId: true,
            isGroupGift: true,
            reservedQuantity: true,
            gift: {
              select: {
                id: true,
                name: true,
                categoryId: true,
                price: true,
                isDefault: true,
                image: { select: { url: true } },
              },
            },
            transactions: {
              where: { status: 'COMPLETED' },
              select: { amount: true, quantity: true },
            },
          },
        })

        if (!current) {
          throw new WishlistGiftMutationError('Regalo no encontrado.')
        }

        const giftChanged =
          giftValues.name !== current.gift.name ||
          giftValues.categoryId !== current.gift.categoryId ||
          giftValues.price !== current.gift.price ||
          giftValues.imageUrl !== (current.gift.image?.url ?? '')

        if (
          giftChanged &&
          giftValues.price !== current.gift.price &&
          !current.isGroupGift &&
          current.reservedQuantity > 0
        ) {
          throw new PriceLockedError()
        }

        let giftId = current.giftId

        if (giftChanged) {
          const gift = current.gift.isDefault
            ? await createGiftRecord(tx, {
                ...giftValues,
                isDefault: false,
                eventId: current.eventId,
              })
            : await updateGiftRecord(tx, current.giftId, giftValues)

          giftId = gift.id
        }

        const completedAmount = current.transactions.reduce(
          (sum, transaction) => sum + (Number(transaction.amount) || 0),
          0
        )
        const completedQuantity = current.transactions.reduce(
          (sum, transaction) => sum + transaction.quantity,
          0
        )
        const progress = wishlistGiftValues.isGroupGift
          ? {
              groupGiftParts: String(completedAmount),
              isFullyPaid:
                Number(giftValues.price) > 0 &&
                completedAmount >= Number(giftValues.price),
            }
          : {
              isFullyPaid: completedQuantity >= wishlistGiftValues.quantity,
            }

        await updateWishlistGiftRecord(
          tx,
          { ...wishlistGiftValues, giftId },
          current.isGroupGift,
          progress
        )

        return { giftId }
      })
    )

    revalidateGiftAndWishlistPaths()
    return result
  } catch (error) {
    if (error instanceof WishlistGiftMutationError) {
      return { error: error.message }
    }

    if (error instanceof PriceLockedError) {
      return {
        error:
          'No se puede cambiar el precio de un regalo individual con unidades reservadas o vendidas.',
      }
    }

    console.error('Error editing gift and wishlist gift:', error)
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
