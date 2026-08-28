import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import type { GiftCreateSchema, GiftEditSchema } from '@/schemas/form'

type GiftWriter = Pick<Prisma.TransactionClient, 'gift'>
type GiftCreateValues = z.infer<typeof GiftCreateSchema>
type GiftEditValues = z.infer<typeof GiftEditSchema>

export const DUPLICATE_GIFT_NAME_ERROR =
  'Ya existe un regalo con ese nombre en esta categoría.'

export class GiftNameConflictError extends Error {
  constructor() {
    super(DUPLICATE_GIFT_NAME_ERROR)
  }
}

type GiftNameScope = {
  isDefault: boolean
  eventId?: string
}

async function assertGiftNameAvailable(
  client: GiftWriter,
  values: Pick<GiftEditValues, 'name' | 'categoryId'>,
  scope: GiftNameScope,
  excludeGiftId?: string
) {
  const [duplicate] = await client.gift.findMany({
    where: {
      ...(excludeGiftId ? { id: { not: excludeGiftId } } : {}),
      categoryId: values.categoryId,
      isDefault: scope.isDefault,
      ...(scope.isDefault ? {} : { eventId: scope.eventId }),
      name: { equals: values.name.trim(), mode: 'insensitive' },
    },
    select: { id: true },
    take: 1,
  })

  if (duplicate) throw new GiftNameConflictError()
}

export async function createGiftRecord(
  client: GiftWriter,
  { imageUrl, ...giftData }: GiftCreateValues,
  giftlistId?: string | null
) {
  await assertGiftNameAvailable(client, giftData, {
    isDefault: giftData.isDefault,
    eventId: giftData.eventId,
  })

  return client.gift.create({
    data: {
      ...giftData,
      ...(giftlistId ? { giftlistId } : {}),
      ...(imageUrl ? { image: { create: { url: imageUrl } } } : {}),
    },
  })
}

export async function updateGiftRecord(
  client: GiftWriter,
  giftId: string,
  { imageUrl, ...giftData }: GiftEditValues,
  giftlistId?: string | null,
  scope: GiftNameScope = { isDefault: true }
) {
  await assertGiftNameAvailable(client, giftData, scope, giftId)

  return client.gift.update({
    where: { id: giftId },
    data: {
      ...giftData,
      ...(giftlistId !== undefined ? { giftlistId } : {}),
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
