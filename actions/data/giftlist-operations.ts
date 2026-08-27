import type { Prisma } from '@prisma/client'

type GiftlistEditor = Pick<Prisma.TransactionClient, 'gift' | 'giftlist'>

type GiftlistSelection = {
  categoryId: string
  giftlistId?: string
  newGiftlistName?: string
}

export class GiftlistSelectionError extends Error {}

export async function createGiftlist(
  tx: GiftlistEditor,
  { categoryId, name }: { categoryId: string; name: string }
) {
  const duplicate = await tx.giftlist.findFirst({
    where: {
      categoryId,
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true },
  })

  if (duplicate) {
    throw new GiftlistSelectionError(
      'Ya existe una colección con ese nombre en esta categoría.'
    )
  }

  return tx.giftlist.create({
    data: { name, categoryId },
    select: { id: true },
  })
}

async function findGiftlistId(
  tx: GiftlistEditor,
  { categoryId, giftlistId }: GiftlistSelection
) {
  if (!giftlistId) return null

  const giftlist = await tx.giftlist.findFirst({
    where: { id: giftlistId, categoryId },
    select: { id: true },
  })

  if (!giftlist) {
    throw new GiftlistSelectionError(
      'La colección seleccionada no existe o no pertenece a esta categoría.'
    )
  }

  return giftlist.id
}

export async function findOrCreateGiftlistId(
  tx: GiftlistEditor,
  selection: GiftlistSelection
) {
  if (!selection.newGiftlistName) {
    return findGiftlistId(tx, selection)
  }

  const giftlist = await createGiftlist(tx, {
    categoryId: selection.categoryId,
    name: selection.newGiftlistName,
  })

  return giftlist.id
}

export async function deleteGiftlistIfEmpty(
  tx: GiftlistEditor,
  giftlistId: string | null
) {
  if (!giftlistId) return

  const remainingGifts = await tx.gift.count({ where: { giftlistId } })

  if (remainingGifts === 0) {
    await tx.giftlist.delete({ where: { id: giftlistId } })
  }
}
