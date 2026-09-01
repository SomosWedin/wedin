import type { Prisma } from '@prisma/client'
import { eventTypeIdsOverlap } from '@/lib/event-type-compatibility'
import { deriveGiftlistEventTypeIds } from '@/lib/giftlist-event-types'

type GiftlistEditor = Pick<
  Prisma.TransactionClient,
  'category' | 'gift' | 'giftlist'
>

export class GiftlistSelectionError extends Error {}

export class GiftlistGiftSelectionError extends Error {}

async function loadGiftlistSelection(
  tx: GiftlistEditor,
  giftlistIds: string[],
  excludeGiftId?: string
) {
  const uniqueIds = Array.from(new Set(giftlistIds))
  if (uniqueIds.length === 0) return { uniqueIds, giftlists: [] }

  const giftlists = await tx.giftlist.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      name: true,
      gifts: {
        ...(excludeGiftId ? { where: { id: { not: excludeGiftId } } } : {}),
        select: { category: { select: { eventTypeIds: true } } },
      },
    },
  })

  if (giftlists.length !== uniqueIds.length) {
    throw new GiftlistSelectionError(
      'Una o más colecciones seleccionadas no existen.'
    )
  }

  return { uniqueIds, giftlists }
}

async function getCategoryEventTypeIds(tx: GiftlistEditor, categoryId: string) {
  const category = await tx.category.findUnique({
    where: { id: categoryId },
    select: { eventTypeIds: true },
  })

  if (!category) {
    throw new GiftlistSelectionError('La categoría seleccionada no existe.')
  }

  return category.eventTypeIds
}

function giftlistSupportsCategory(
  gifts: { category: { eventTypeIds: string[] } }[],
  categoryEventTypeIds: string[]
) {
  if (gifts.length === 0) return true

  return eventTypeIdsOverlap(
    deriveGiftlistEventTypeIds(gifts),
    categoryEventTypeIds
  )
}

export async function validateGiftlistIdsForCreate(
  tx: GiftlistEditor,
  giftlistIds: string[],
  categoryId: string
) {
  const { uniqueIds, giftlists } = await loadGiftlistSelection(tx, giftlistIds)
  if (uniqueIds.length === 0) return uniqueIds

  const categoryEventTypeIds = await getCategoryEventTypeIds(tx, categoryId)
  if (
    giftlists.some(
      giftlist =>
        !giftlistSupportsCategory(giftlist.gifts, categoryEventTypeIds)
    )
  ) {
    throw new GiftlistSelectionError(
      'Uno o más regalos no comparten un tipo de evento con la colección seleccionada.'
    )
  }

  return uniqueIds
}

export async function validateGiftlistIdsForEdit(
  tx: GiftlistEditor,
  giftlistIds: string[],
  categoryId: string,
  giftId: string,
  existingGiftlistIds: string[]
) {
  const { uniqueIds, giftlists } = await loadGiftlistSelection(
    tx,
    giftlistIds,
    giftId
  )
  if (uniqueIds.length === 0) {
    return { giftlistIds: uniqueIds, removedGiftlists: [] }
  }

  const categoryEventTypeIds = await getCategoryEventTypeIds(tx, categoryId)
  const existingIds = new Set(existingGiftlistIds)
  const incompatible = giftlists.filter(
    giftlist => !giftlistSupportsCategory(giftlist.gifts, categoryEventTypeIds)
  )
  const newlySelectedIncompatible = incompatible.find(
    giftlist => !existingIds.has(giftlist.id)
  )

  if (newlySelectedIncompatible) {
    throw new GiftlistSelectionError(
      'El regalo no comparte un tipo de evento con una colección seleccionada.'
    )
  }

  const removedIds = new Set(incompatible.map(giftlist => giftlist.id))
  return {
    giftlistIds: uniqueIds.filter(id => !removedIds.has(id)),
    removedGiftlists: incompatible.map(giftlist => ({
      id: giftlist.id,
      name: giftlist.name,
    })),
  }
}

export async function validateCatalogGiftIds(
  tx: GiftlistEditor,
  giftIds: string[]
) {
  const uniqueIds = Array.from(new Set(giftIds))
  if (uniqueIds.length === 0) return uniqueIds

  const gifts = await tx.gift.findMany({
    where: { id: { in: uniqueIds }, isDefault: true },
    select: {
      id: true,
      category: { select: { eventTypeIds: true } },
    },
  })

  if (gifts.length !== uniqueIds.length) {
    throw new GiftlistGiftSelectionError(
      'Uno o más regalos seleccionados no existen en el catálogo.'
    )
  }

  if (gifts.some(gift => gift.category.eventTypeIds.length === 0)) {
    throw new GiftlistGiftSelectionError(
      'No se pueden guardar regalos cuya categoría no tiene tipos de evento asignados.'
    )
  }

  if (deriveGiftlistEventTypeIds(gifts).length === 0) {
    throw new GiftlistGiftSelectionError(
      'Los regalos seleccionados no comparten ningún tipo de evento.'
    )
  }

  return uniqueIds
}
