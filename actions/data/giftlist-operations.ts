import type { Prisma } from '@prisma/client'

type GiftlistEditor = Pick<Prisma.TransactionClient, 'category' | 'giftlist'>

type GiftlistSelection = {
  categoryId: string
  giftlistIds: string[]
}

export class GiftlistSelectionError extends Error {}

export async function validateGiftlistIds(
  tx: GiftlistEditor,
  { categoryId, giftlistIds }: GiftlistSelection
) {
  const uniqueIds = Array.from(new Set(giftlistIds))
  if (uniqueIds.length === 0) return uniqueIds

  const giftlists = await tx.giftlist.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, eventTypeIds: true },
  })

  if (giftlists.length !== uniqueIds.length) {
    throw new GiftlistSelectionError(
      'Una o más colecciones seleccionadas no existen.'
    )
  }

  const category = await tx.category.findUnique({
    where: { id: categoryId },
    select: { eventTypeIds: true },
  })

  if (
    !category ||
    giftlists.some(giftlist =>
      giftlist.eventTypeIds.some(
        eventTypeId => !category.eventTypeIds.includes(eventTypeId)
      )
    )
  ) {
    throw new GiftlistSelectionError(
      'La categoría seleccionada no es compatible con los tipos de evento de una o más colecciones.'
    )
  }

  return uniqueIds
}
