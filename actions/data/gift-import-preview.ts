import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { buildGiftImportPreview } from '@/lib/gift-import'
import { buildGiftNameScopeKey } from '@/lib/gift-name'
import { deriveGiftlistEventTypeIds } from '@/lib/giftlist-event-types'
import type {
  GiftImportCatalog,
  GiftImportPreviewRow,
  GiftImportRow,
} from '@/schemas/gift-import'

export function reviewResult<T>(preview: T[]) {
  return {
    preview,
    previewToken: createHash('sha256')
      .update(JSON.stringify(preview))
      .digest('hex'),
  }
}

export async function loadImportCatalog(
  client: Prisma.TransactionClient
): Promise<GiftImportCatalog> {
  const [categories, collections, eventTypes] = await Promise.all([
    client.category.findMany({
      select: { id: true, name: true, eventTypeIds: true },
    }),
    client.giftlist.findMany({
      select: { id: true, name: true, gifts: { select: { categoryId: true } } },
    }),
    client.eventType.findMany({ select: { id: true, name: true, key: true } }),
  ])
  const eventTypeIdsByCategory = new Map(
    categories.map(category => [category.id, category.eventTypeIds])
  )
  return {
    categories,
    eventTypes,
    collections: collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      giftCount: collection.gifts.length,
      eventTypeIds: deriveGiftlistEventTypeIds(
        collection.gifts.map(gift => ({
          category: {
            eventTypeIds: eventTypeIdsByCategory.get(gift.categoryId) ?? [],
          },
        }))
      ),
    })),
  }
}

export async function resolveExistingGifts(
  client: Prisma.TransactionClient,
  preview: Pick<GiftImportPreviewRow, 'values'>[]
): Promise<Map<string, string>> {
  const keys = preview.flatMap(row =>
    row.values
      ? [buildGiftNameScopeKey({ ...row.values, isDefault: true })]
      : []
  )
  if (!keys.length) return new Map()
  const existing = await client.gift.findMany({
    where: { nameScopeKey: { in: keys } },
    select: { id: true, nameScopeKey: true },
  })
  return new Map(existing.map(gift => [gift.nameScopeKey, gift.id]))
}

export async function previewRows(
  client: Prisma.TransactionClient,
  rows: GiftImportRow[],
  createMissingCollections: boolean
) {
  const catalog = await loadImportCatalog(client)
  const initial = buildGiftImportPreview(
    rows,
    catalog,
    new Set(),
    createMissingCollections
  )
  const existingById = await resolveExistingGifts(client, initial)
  return buildGiftImportPreview(
    rows,
    catalog,
    new Set(existingById.keys()),
    createMissingCollections
  ).map(row => ({
    ...row,
    existingGiftId: row.values
      ? existingById.get(
          buildGiftNameScopeKey({ ...row.values, isDefault: true })
        )
      : undefined,
  }))
}

export async function saveImportReview<T extends { rowNumber: number }>(
  client: Prisma.TransactionClient,
  jobId: string,
  preview: T[]
) {
  for (let offset = 0; offset < preview.length; offset += 100) {
    const saved = await client.$runCommandRaw({
      update: 'GiftImportRow',
      updates: preview.slice(offset, offset + 100).map(row => ({
        q: { jobId: { $oid: jobId }, rowNumber: row.rowNumber },
        u: { $set: { review: JSON.parse(JSON.stringify(row)) } },
        multi: false,
      })),
    })
    if (
      saved.writeErrors ||
      saved.writeConcernError ||
      saved.n !== preview.slice(offset, offset + 100).length
    )
      throw new Error('Review persistence failed')
  }
}
