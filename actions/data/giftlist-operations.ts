import type { Prisma } from '@prisma/client'

type GiftlistEditor = Pick<Prisma.TransactionClient, 'gift' | 'giftlist'>

export class GiftlistSelectionError extends Error {}

export class GiftlistGiftSelectionError extends Error {}

export async function validateGiftlistIds(
  tx: GiftlistEditor,
  giftlistIds: string[]
) {
  const uniqueIds = Array.from(new Set(giftlistIds))
  if (uniqueIds.length === 0) return uniqueIds

  const giftlists = await tx.giftlist.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  })

  if (giftlists.length !== uniqueIds.length) {
    throw new GiftlistSelectionError(
      'Una o más colecciones seleccionadas no existen.'
    )
  }

  return uniqueIds
}

export async function validateCatalogGiftIds(
  tx: GiftlistEditor,
  giftIds: string[]
) {
  const uniqueIds = Array.from(new Set(giftIds))
  if (uniqueIds.length === 0) return uniqueIds

  const gifts = await tx.gift.findMany({
    where: { id: { in: uniqueIds }, isDefault: true },
    select: { id: true },
  })

  if (gifts.length !== uniqueIds.length) {
    throw new GiftlistGiftSelectionError(
      'Uno o más regalos seleccionados no existen en el catálogo.'
    )
  }

  return uniqueIds
}
