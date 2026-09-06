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

export function reviewResult(preview: GiftImportPreviewRow[]) {
  return {
    preview,
    previewToken: createHash('sha256')
      .update(JSON.stringify(preview))
      .digest('hex'),
  }
}

export async function previewRows(
  client: Prisma.TransactionClient,
  rows: GiftImportRow[],
  createMissingCollections: boolean
) {
  const [categories, collections, eventTypes] = await Promise.all([
    client.category.findMany({
      select: { id: true, name: true, eventTypeIds: true },
    }),
    client.giftlist.findMany({
      select: {
        id: true,
        name: true,
        gifts: { select: { category: { select: { eventTypeIds: true } } } },
      },
    }),
    client.eventType.findMany({ select: { id: true, name: true, key: true } }),
  ])
  const catalog: GiftImportCatalog = {
    categories,
    eventTypes,
    collections: collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      giftCount: collection.gifts.length,
      eventTypeIds: deriveGiftlistEventTypeIds(collection.gifts),
    })),
  }
  const initial = buildGiftImportPreview(
    rows,
    catalog,
    new Set(),
    createMissingCollections
  )
  const keys = initial.flatMap(row =>
    row.values
      ? [buildGiftNameScopeKey({ ...row.values, isDefault: true })]
      : []
  )
  const existing = keys.length
    ? await client.gift.findMany({
        where: { nameScopeKey: { in: keys } },
        select: { id: true, nameScopeKey: true },
      })
    : []
  const existingIds = new Map(
    existing.map(gift => [gift.nameScopeKey, gift.id])
  )
  return buildGiftImportPreview(
    rows,
    catalog,
    new Set(existing.map(gift => gift.nameScopeKey)),
    createMissingCollections
  ).map(row => ({
    ...row,
    existingGiftId: row.values
      ? existingIds.get(
          buildGiftNameScopeKey({ ...row.values, isDefault: true })
        )
      : undefined,
  }))
}

export async function saveImportReview(
  client: Prisma.TransactionClient,
  jobId: string,
  preview: GiftImportPreviewRow[]
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
