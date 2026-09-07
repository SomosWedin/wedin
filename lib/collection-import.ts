import type {
  CollectionImportMapping,
  CollectionImportPreviewRow,
  CollectionImportReviewFilter,
  CollectionImportRow,
} from '@/schemas/collection-import'
import { GiftlistNameSchema } from '@/schemas/form'
import type { GiftImportDataset } from '@/schemas/gift-import'
import { normalizeImportLabel } from './gift-import'

const notionReference = /(?:^|,\s*)(.*?)\s*\((https?:\/\/[^)]+)\)(?=,\s*|$)/g

export function parseCollectionGiftReferences(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return []
  const linked = Array.from(trimmed.matchAll(notionReference)).map(match => ({
    sourceKey: match[2],
    name: match[1].trim(),
    url: match[2],
  }))
  if (
    linked.length &&
    linked.length === (trimmed.match(/https?:\/\//g) || []).length
  )
    return linked
  return Array.from(
    new Set(
      trimmed
        .split(/[;|\n]/)
        .map(name => name.trim())
        .filter(Boolean)
    )
  ).map(name => ({ sourceKey: normalizeImportLabel(name), name }))
}

export function autoMatchCollectionImportHeaders(
  headers: string[]
): CollectionImportMapping {
  const aliases = {
    name: ['nome', 'nombre', 'coleccion', 'collection', 'titulo'],
    gifts: ['regalos', 'gifts', 'productos', 'items'],
  }
  return Object.fromEntries(
    Object.entries(aliases).map(([key, values]) => {
      const matches = headers.flatMap((header, index) =>
        values.includes(normalizeImportLabel(header)) ? [index] : []
      )
      return [
        key,
        { column: matches.length === 1 ? matches[0] : null, value: '' },
      ]
    })
  ) as CollectionImportMapping
}

export function mapCollectionImportRows(
  dataset: GiftImportDataset,
  mapping: CollectionImportMapping,
  matches: Record<string, string>
): CollectionImportRow[] {
  const read = (cells: string[], field: keyof CollectionImportMapping) => {
    const selected = mapping[field]
    return (
      selected.column === null
        ? selected.value
        : cells[selected.column] || selected.value
    ).trim()
  }
  return dataset.rows.map(row => ({
    rowNumber: row.rowNumber,
    name: read(row.cells, 'name'),
    gifts: parseCollectionGiftReferences(read(row.cells, 'gifts')).map(
      gift => ({
        ...gift,
        ...(matches[gift.sourceKey] ? { giftId: matches[gift.sourceKey] } : {}),
      })
    ),
  }))
}

export function validateCollectionName(name: string) {
  return GiftlistNameSchema.safeParse(name)
}

export function filterCollectionImportPreview(
  rows: CollectionImportPreviewRow[],
  filter: CollectionImportReviewFilter
) {
  if (filter === 'all') return rows
  if (filter === 'removals') return rows.filter(row => row.removed.length)
  if (filter === 'ignored') return rows.filter(row => row.ignored.length)
  return rows.filter(row => row.action === filter)
}

export function chunkCollectionImportRows(rows: CollectionImportRow[]) {
  const chunks: CollectionImportRow[][] = []
  let current: CollectionImportRow[] = []
  for (const row of rows) {
    const candidate = [...current, row]
    if (
      current.length &&
      (candidate.length > 20 ||
        new TextEncoder().encode(JSON.stringify(candidate)).length > 590_000)
    ) {
      chunks.push(current)
      current = [row]
    } else current = candidate
  }
  if (current.length) chunks.push(current)
  return chunks
}
