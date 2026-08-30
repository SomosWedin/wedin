import type { Prisma } from '@prisma/client'

type GiftlistEditor = Pick<Prisma.TransactionClient, 'giftlist'>

export class GiftlistSelectionError extends Error {}

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
