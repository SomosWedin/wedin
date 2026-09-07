import type { Prisma } from '@prisma/client'
import { validateCollectionName } from '@/lib/collection-import'
import { normalizeImportLabel } from '@/lib/gift-import'
import { deriveGiftlistEventTypeIds } from '@/lib/giftlist-event-types'
import type {
  CollectionImportGift,
  CollectionImportPreviewRow,
  CollectionImportRow,
} from '@/schemas/collection-import'

const sameIds = (left: string[], right: string[]) => {
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((id, index) => id === sortedRight[index])
  )
}

export async function previewCollectionRows(
  client: Prisma.TransactionClient,
  rows: CollectionImportRow[]
) {
  const collections = await client.giftlist.findMany({
    select: { id: true, name: true, normalizedName: true, giftIds: true },
  })
  const currentIds = Array.from(
    new Set(collections.flatMap(collection => collection.giftIds))
  )
  const [gifts, eventTypes] = await Promise.all([
    client.gift.findMany({
      where: {
        OR: [
          { isDefault: true },
          ...(currentIds.length ? [{ id: { in: currentIds } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
        category: {
          select: {
            name: true,
            eventTypeIds: true,
          },
        },
      },
    }),
    client.eventType.findMany({ select: { id: true, name: true } }),
  ])
  const giftsById = new Map(gifts.map(gift => [gift.id, gift]))
  const catalogByName = new Map<string, typeof gifts>()
  for (const gift of gifts.filter(gift => gift.isDefault)) {
    const key = normalizeImportLabel(gift.name)
    catalogByName.set(key, [...(catalogByName.get(key) || []), gift])
  }
  const collectionsByName = new Map(
    collections.map(collection => [collection.normalizedName, collection])
  )
  const rowNameCounts = new Map<string, number>()
  for (const row of rows) {
    const name = row.name.trim().toLocaleLowerCase('es-PY')
    rowNameCounts.set(name, (rowNameCounts.get(name) || 0) + 1)
  }
  const duplicateRows = new Set(
    Array.from(rowNameCounts)
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  )
  const summarize = (gift: (typeof gifts)[number]): CollectionImportGift => ({
    id: gift.id,
    name: gift.name,
    categoryName: gift.category.name,
    eventTypeIds: gift.category.eventTypeIds,
  })

  return rows.map((row): CollectionImportPreviewRow => {
    const errors: string[] = []
    const warnings: string[] = []
    const parsedName = validateCollectionName(row.name)
    const normalizedName = row.name.trim().toLocaleLowerCase('es-PY')
    const existing = collectionsByName.get(normalizedName)
    if (!parsedName.success)
      errors.push(
        parsedName.error.issues[0]?.message || 'Nombre de colección inválido.'
      )
    if (duplicateRows.has(normalizedName))
      errors.push('La colección está repetida en el archivo.')

    const ignored: { name: string; reason: string }[] = []
    const resolved = row.gifts.flatMap(reference => {
      if (reference.giftId) {
        const selected = giftsById.get(reference.giftId)
        if (selected?.isDefault) return [selected]
        ignored.push({
          name: reference.name,
          reason: 'El regalo seleccionado ya no existe en el catálogo.',
        })
        return []
      }
      const matches =
        catalogByName.get(normalizeImportLabel(reference.name)) || []
      if (matches.length === 1) return matches
      ignored.push({
        name: reference.name,
        reason: matches.length
          ? 'Hay varios regalos con este nombre. Elegí uno en el paso anterior.'
          : 'No se encontró en el catálogo y no se agregará.',
      })
      return []
    })
    const target = Array.from(
      new Map(resolved.map(gift => [gift.id, gift])).values()
    )
    if (ignored.length)
      warnings.push(
        `${ignored.length} ${ignored.length === 1 ? 'referencia será ignorada' : 'referencias serán ignoradas'}.`
      )
    if (!existing && target.length === 0)
      errors.push(
        'No se puede crear una colección sin al menos un regalo encontrado.'
      )
    if (target.some(gift => gift.category.eventTypeIds.length === 0))
      errors.push('Uno o más regalos tienen una categoría sin tipos de evento.')
    const commonEventTypeIds = deriveGiftlistEventTypeIds(target)
    if (target.length && commonEventTypeIds.length === 0)
      errors.push('Los regalos no comparten ningún tipo de evento.')

    const expectedGiftIds = existing?.giftIds || []
    const targetGiftIds = target.map(gift => gift.id)
    const expected = new Set(expectedGiftIds)
    const wanted = new Set(targetGiftIds)
    const added = target.filter(gift => !expected.has(gift.id)).map(summarize)
    const retained = target.filter(gift => expected.has(gift.id)).map(summarize)
    const removed = expectedGiftIds
      .filter(id => !wanted.has(id))
      .map(id => {
        const gift = giftsById.get(id)
        return gift
          ? summarize(gift)
          : {
              id,
              name: 'Regalo no encontrado',
              categoryName: 'Sin categoría',
              eventTypeIds: [],
            }
      })
    const categories = Array.from(
      new Set(target.map(gift => gift.category.name))
    ).sort((a, b) => a.localeCompare(b, 'es'))
    const eventTypeNames = eventTypes
      .filter(type => commonEventTypeIds.includes(type.id))
      .map(type => type.name)
      .sort((a, b) => a.localeCompare(b, 'es'))
    const action = errors.length
      ? 'invalid'
      : !existing
        ? 'create'
        : sameIds(expectedGiftIds, targetGiftIds)
          ? 'unchanged'
          : 'update'

    return {
      rowNumber: row.rowNumber,
      name: parsedName.success ? parsedName.data : row.name.trim(),
      ...(existing ? { collectionId: existing.id } : {}),
      action,
      added,
      removed,
      retained,
      ignored,
      categories,
      eventTypes: eventTypeNames,
      warnings,
      errors,
      values:
        errors.length || !parsedName.success
          ? null
          : {
              name: parsedName.data,
              ...(existing ? { collectionId: existing.id } : {}),
              expectedGiftIds,
              targetGiftIds,
            },
    }
  })
}
