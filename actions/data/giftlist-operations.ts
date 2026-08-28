import type { Prisma } from '@prisma/client'

type GiftlistEditor = Pick<Prisma.TransactionClient, 'gift' | 'giftlist'>

type GiftlistSelection = {
  giftlistId?: string
  newGiftlistName?: string
}

export class GiftlistSelectionError extends Error { }

function normalizeGiftlistName(name: string) {
  return name.trim().toLocaleLowerCase('es-PY')
}

export async function createGiftlist(
  tx: GiftlistEditor,
  { name }: { name: string }
) {
  const normalizedName = normalizeGiftlistName(name)
  const duplicate = await tx.giftlist.findFirst({
    where: {
      normalizedName,
    },
    select: { id: true },
  })

  if (duplicate) {
    throw new GiftlistSelectionError('Ya existe una colección con ese nombre.')
  }

  return tx.giftlist.create({
    data: { name, normalizedName },
    select: { id: true },
  })
}

async function findGiftlistId(
  tx: GiftlistEditor,
  { giftlistId }: GiftlistSelection
) {
  if (!giftlistId) return null

  const giftlist = await tx.giftlist.findFirst({
    where: { id: giftlistId },
    select: { id: true },
  })

  if (!giftlist) {
    throw new GiftlistSelectionError('La colección seleccionada no existe.')
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
