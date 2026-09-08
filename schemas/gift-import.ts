import { z } from 'zod'

export const MAX_IMPORT_ROWS = 10_000
export const MAX_IMPORT_COLUMNS = 100
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024
export const MAX_IMPORT_PAYLOAD_BYTES = 12 * 1024 * 1024
export const MAX_IMPORT_UPLOAD_ROWS = 200

export const giftImportFields = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'price', label: 'Precio (Gs.)', required: true },
  { key: 'category', label: 'Categoría', required: true },
  { key: 'collections', label: 'Colecciones', required: false },
  { key: 'eventTypes', label: 'Tipos de evento', required: false },
  { key: 'imageUrl', label: 'URL de imagen', required: false },
] as const

export type GiftImportField = (typeof giftImportFields)[number]['key']
export type GiftImportRelation = 'category' | 'collections' | 'eventTypes'
export type GiftImportMapping = Record<
  GiftImportField,
  { column: number | null; value: string }
>
export type GiftImportValueMatches = Record<
  GiftImportRelation,
  Record<string, string>
>

const cell = z.string().trim().max(4096)
export const GiftImportRowSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    name: cell,
    price: cell,
    category: cell,
    collections: cell,
    eventTypes: cell,
    imageUrl: cell,
  })
  .strict()

export const GiftImportRowsSchema = z
  .array(GiftImportRowSchema)
  .min(1, 'El archivo no contiene regalos.')
  .max(
    MAX_IMPORT_ROWS,
    `Podés importar hasta ${MAX_IMPORT_ROWS} regalos por vez.`
  )
  .superRefine((rows, ctx) => {
    if (new Set(rows.map(row => row.rowNumber)).size !== rows.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hay números de fila repetidos.',
      })
    }
    if (
      new TextEncoder().encode(JSON.stringify(rows)).length >
      MAX_IMPORT_PAYLOAD_BYTES
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Los datos son demasiado grandes. Dividí el archivo en partes más pequeñas.',
      })
    }
  })

export const GiftImportPreviewSchema = z
  .object({
    rows: GiftImportRowsSchema,
    createMissingCollections: z.boolean(),
  })
  .strict()

export type GiftImportRow = z.infer<typeof GiftImportRowSchema>
export type GiftImportDataset = {
  name: string
  headers: string[]
  rows: { rowNumber: number; cells: string[] }[]
}

export type GiftImportCatalog = {
  categories: { id: string; name: string; eventTypeIds: string[] }[]
  collections: {
    id: string
    name: string
    giftCount: number
    eventTypeIds: string[]
  }[]
  eventTypes: { id: string; name: string; key: string }[]
}

export const giftImportErrorLabels = {
  existing_gift: 'Ya existen en Wedin',
  duplicate_row: 'Duplicados en el archivo',
  name: 'Nombre',
  price: 'Precio',
  category: 'Categoría',
  event_types: 'Tipos de evento',
  collections: 'Colecciones',
  collection_compatibility: 'Compatibilidad de colecciones',
  image: 'Imagen',
  other: 'Otros errores',
} as const
export type GiftImportErrorType = keyof typeof giftImportErrorLabels
export type GiftImportReviewFilter =
  | 'all'
  | 'valid'
  | 'errors'
  | GiftImportErrorType

export type GiftImportPreviewRow = {
  rowNumber: number
  existingGiftId?: string
  name: string
  price: string
  category: string
  collections: string[]
  eventTypes: string[]
  imageUrl: string
  errors: string[]
  errorTypes?: GiftImportErrorType[]
  values: {
    name: string
    price: string
    categoryId: string
    giftlistIds: string[]
    newGiftlistNames: string[]
    imageUrl: string
  } | null
}

export const ExistingImportGiftIdSchema = z.string().regex(/^[a-f\d]{24}$/i)
