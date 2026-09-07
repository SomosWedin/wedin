import { z } from 'zod'
import type { GiftImportDataset } from './gift-import'
import { MAX_IMPORT_PAYLOAD_BYTES, MAX_IMPORT_ROWS } from './gift-import'

export const MAX_COLLECTION_GIFTS = 500
export const MAX_COLLECTION_GIFT_REFERENCES = 50_000

export const collectionImportFields = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'gifts', label: 'Regalos', required: true },
] as const

export type CollectionImportField =
  (typeof collectionImportFields)[number]['key']
export type CollectionImportMapping = Record<
  CollectionImportField,
  { column: number | null; value: string }
>

const giftReference = z
  .object({
    sourceKey: z.string().trim().min(1).max(2048),
    name: z.string().trim().min(1).max(512),
    url: z.string().url().max(2048).optional(),
    giftId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
  })
  .strict()

export const CollectionImportRowSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    name: z.string().trim().max(256),
    gifts: z.array(giftReference).max(MAX_COLLECTION_GIFTS),
  })
  .strict()

export const CollectionImportRowsSchema = z
  .array(CollectionImportRowSchema)
  .min(1, 'El archivo no contiene colecciones.')
  .max(MAX_IMPORT_ROWS)
  .superRefine((rows, ctx) => {
    if (new Set(rows.map(row => row.rowNumber)).size !== rows.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hay números de fila repetidos.',
      })
    if (
      rows.reduce((total, row) => total + row.gifts.length, 0) >
      MAX_COLLECTION_GIFT_REFERENCES
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La importación supera ${MAX_COLLECTION_GIFT_REFERENCES} referencias de regalos.`,
      })
    if (
      new TextEncoder().encode(JSON.stringify(rows)).length >
      MAX_IMPORT_PAYLOAD_BYTES
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Los datos son demasiado grandes. Dividí el archivo.',
      })
  })

export type CollectionImportRow = z.infer<typeof CollectionImportRowSchema>
export type CollectionImportDataset = GiftImportDataset

export type CollectionImportGift = {
  id: string
  name: string
  categoryName: string
  eventTypeIds: string[]
}

export type CollectionImportPreviewRow = {
  rowNumber: number
  name: string
  collectionId?: string
  action: 'create' | 'update' | 'unchanged' | 'invalid'
  added: CollectionImportGift[]
  removed: CollectionImportGift[]
  retained: CollectionImportGift[]
  ignored: { name: string; reason: string }[]
  categories: string[]
  eventTypes: string[]
  warnings: string[]
  errors: string[]
  values: {
    name: string
    collectionId?: string
    expectedGiftIds: string[]
    targetGiftIds: string[]
  } | null
}

export type CollectionImportReviewFilter =
  | 'all'
  | 'create'
  | 'update'
  | 'unchanged'
  | 'invalid'
  | 'removals'
  | 'ignored'
