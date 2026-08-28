import type { Prisma } from '@prisma/client'

type GiftlistEditor = Pick<
  Prisma.TransactionClient,
  'category' | 'gift' | 'giftlist'
>

type GiftlistSelection = {
  categoryId: string
  giftlistId?: string
  newGiftlistName?: string
}

export class GiftlistSelectionError extends Error {}

function normalizeGiftlistName(name: string) {
  return name.trim().toLocaleLowerCase('es-PY')
}

export async function createGiftlist(
  tx: GiftlistEditor,
  { name, eventTypeIds }: { name: string; eventTypeIds: string[] }
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
    data: {
      name,
      normalizedName,
      eventTypes: {
        connect: eventTypeIds.map(id => ({ id })),
      },
    },
    select: { id: true },
  })
}

async function findGiftlistId(
  tx: GiftlistEditor,
  { categoryId, giftlistId }: GiftlistSelection
) {
  if (!giftlistId) return null

  const giftlist = await tx.giftlist.findFirst({
    where: { id: giftlistId },
    select: { id: true, eventTypeIds: true },
  })

  if (!giftlist) {
    throw new GiftlistSelectionError('La colección seleccionada no existe.')
  }

  const category = await tx.category.findUnique({
    where: { id: categoryId },
    select: { eventTypeIds: true },
  })

  if (
    !category ||
    giftlist.eventTypeIds.some(
      eventTypeId => !category.eventTypeIds.includes(eventTypeId)
    )
  ) {
    throw new GiftlistSelectionError(
      'La categoría seleccionada no es compatible con los tipos de evento de esta colección.'
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

  const category = await tx.category.findUnique({
    where: { id: selection.categoryId },
    select: { eventTypeIds: true },
  })

  if (!category) {
    throw new GiftlistSelectionError('La categoría seleccionada no existe.')
  }

  if (category.eventTypeIds.length === 0) {
    throw new GiftlistSelectionError(
      'La categoría seleccionada no tiene tipos de evento asignados.'
    )
  }

  const giftlist = await createGiftlist(tx, {
    name: selection.newGiftlistName,
    eventTypeIds: category.eventTypeIds,
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
    await tx.giftlist.update({
      where: { id: giftlistId },
      data: { eventTypes: { set: [] } },
    })
    await tx.giftlist.delete({ where: { id: giftlistId } })
  }
}
