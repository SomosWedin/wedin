import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { buildGiftNameScopeKey } from '@/lib/gift-name'
import type { GiftCreateSchema, GiftEditSchema } from '@/schemas/form'

type GiftWriter = Pick<Prisma.TransactionClient, 'category' | 'gift'>
type GiftCreateValues = z.infer<typeof GiftCreateSchema>
type GiftEditValues = z.infer<typeof GiftEditSchema>

export const DUPLICATE_GIFT_NAME_ERROR =
  'Ya existe un regalo con ese nombre en esta categoría.'

export class GiftNameConflictError extends Error {
  constructor() {
    super(DUPLICATE_GIFT_NAME_ERROR)
  }
}

export function isGiftNameUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}

export const CATEGORY_NOT_FOUND_ERROR = 'La categoría seleccionada no existe.'

export class CategoryNotFoundError extends Error {
  constructor() {
    super(CATEGORY_NOT_FOUND_ERROR)
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

async function assertCategoryExists(client: GiftWriter, categoryId: string) {
  const category = await client.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  })

  if (!category) throw new CategoryNotFoundError()
}

export async function createGiftRecord(
  client: GiftWriter,
  { imageUrl, categoryId, eventId, ...giftData }: GiftCreateValues,
  giftlistIds: string[] = []
) {
  await assertCategoryExists(client, categoryId)
  await assertGiftNameAvailable(
    client,
    { ...giftData, categoryId },
    {
      isDefault: giftData.isDefault,
      eventId,
    }
  )

  return client.gift.create({
    data: {
      ...giftData,
      nameScopeKey: buildGiftNameScopeKey({
        name: giftData.name,
        categoryId,
        isDefault: giftData.isDefault,
        eventId,
      }),
      category: { connect: { id: categoryId } },
      ...(eventId ? { event: { connect: { id: eventId } } } : {}),
      giftlists: { connect: giftlistIds.map(id => ({ id })) },
      ...(imageUrl ? { image: { create: { url: imageUrl } } } : {}),
    },
  })
}

export async function updateGiftRecord(
  client: GiftWriter,
  giftId: string,
  { imageUrl, categoryId, ...giftData }: GiftEditValues,
  giftlistIds?: string[],
  scope: GiftNameScope = { isDefault: true }
) {
  await assertCategoryExists(client, categoryId)
  await assertGiftNameAvailable(
    client,
    { ...giftData, categoryId },
    scope,
    giftId
  )

  return client.gift.update({
    where: { id: giftId },
    data: {
      ...giftData,
      nameScopeKey: buildGiftNameScopeKey({
        name: giftData.name,
        categoryId,
        isDefault: scope.isDefault,
        eventId: scope.eventId,
      }),
      category: { connect: { id: categoryId } },
      ...(giftlistIds !== undefined
        ? { giftlists: { set: giftlistIds.map(id => ({ id })) } }
        : {}),
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
