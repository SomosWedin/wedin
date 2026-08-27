import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import type { GiftCreateSchema, GiftEditSchema } from '@/schemas/form'

type GiftWriter = Pick<Prisma.TransactionClient, 'gift'>
type GiftCreateValues = z.infer<typeof GiftCreateSchema>
type GiftEditValues = z.infer<typeof GiftEditSchema>

export function createGiftRecord(
  client: GiftWriter,
  { imageUrl, ...giftData }: GiftCreateValues,
  giftlistId?: string | null
) {
  return client.gift.create({
    data: {
      ...giftData,
      ...(giftlistId ? { giftlistId } : {}),
      ...(imageUrl ? { image: { create: { url: imageUrl } } } : {}),
    },
  })
}

export function updateGiftRecord(
  client: GiftWriter,
  giftId: string,
  { imageUrl, ...giftData }: GiftEditValues,
  giftlistId?: string | null
) {
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
