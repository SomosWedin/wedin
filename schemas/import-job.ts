import { z } from 'zod'
import { CollectionImportRowSchema } from './collection-import'
import {
  GiftImportRowSchema,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_UPLOAD_ROWS,
} from './gift-import'

export const JobIdSchema = z.string().regex(/^[a-f\d]{24}$/i)
export const IMPORT_REVIEW_PAGE_SIZE = 50
export const StartImportJobSchema = z
  .object({
    submissionId: z.string().uuid(),
    filename: z.string().trim().min(1).max(256),
    expectedRows: z.number().int().min(1).max(MAX_IMPORT_ROWS),
    createMissingCollections: z.boolean(),
  })
  .strict()
export const StartCollectionImportJobSchema = z
  .object({
    submissionId: z.string().uuid(),
    filename: z.string().trim().min(1).max(256),
    expectedRows: z.number().int().min(1).max(MAX_IMPORT_ROWS),
  })
  .strict()
export const UploadImportRowsSchema = z
  .object({
    jobId: JobIdSchema,
    offset: z.number().int().min(0).max(MAX_IMPORT_ROWS),
    rows: z.array(GiftImportRowSchema).min(1).max(MAX_IMPORT_UPLOAD_ROWS),
  })
  .strict()
  .refine(
    value => new TextEncoder().encode(JSON.stringify(value)).length <= 600_000,
    'El bloque es demasiado grande.'
  )
export const UploadCollectionImportRowsSchema = z
  .object({
    jobId: JobIdSchema,
    offset: z.number().int().min(0).max(MAX_IMPORT_ROWS),
    rows: z.array(CollectionImportRowSchema).min(1).max(MAX_IMPORT_UPLOAD_ROWS),
  })
  .strict()
  .refine(
    value => new TextEncoder().encode(JSON.stringify(value)).length <= 600_000,
    'El bloque es demasiado grande.'
  )
export const AcceptImportJobSchema = z
  .object({
    jobId: JobIdSchema,
    previewToken: z.string().regex(/^[a-f0-9]{64}$/),
    excludedRowNumbers: z
      .array(z.number().int().positive())
      .max(MAX_IMPORT_ROWS),
  })
  .strict()
export const AcceptCollectionImportJobSchema = AcceptImportJobSchema.extend({
  acknowledgeRemovals: z.boolean(),
  acknowledgeIgnored: z.boolean(),
}).strict()
export const ImportMessageSchema = z
  .object({ jobId: JobIdSchema, runId: z.string().uuid() })
  .strict()
export const JobListSchema = z.object({
  page: z.number().int().min(0).max(100000).default(0),
  search: z.string().max(256).default(''),
  status: z
    .enum([
      'PREPARING',
      'CANCELLED',
      'QUEUED',
      'PROCESSING',
      'COMPLETED',
      'COMPLETED_WITH_ERRORS',
      'FAILED',
    ])
    .optional(),
  kind: z.enum(['GIFT', 'COLLECTION']).optional(),
})
export const importKindLabels = {
  GIFT: 'Regalos',
  COLLECTION: 'Colecciones',
} as const
export const JobDetailsSchema = z.object({
  jobId: JobIdSchema,
  page: z.number().int().min(0).default(0),
  historyPage: z.number().int().min(0).default(0),
})
export const jobStatusLabels = {
  PREPARING: 'Borrador en revisión',
  CANCELLED: 'Cancelada',
  QUEUED: 'En cola',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completada',
  COMPLETED_WITH_ERRORS: 'Completada con errores',
  FAILED: 'Fallida',
} as const
export const rowStatusLabels = {
  PENDING: 'Pendiente',
  CREATED: 'Creado',
  UPDATED: 'Actualizado',
  SKIPPED: 'Omitido',
  FAILED: 'Fallido',
} as const
