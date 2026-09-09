import { randomUUID } from 'node:crypto'
import type { GiftImportJob, ImportJobKind, Prisma } from '@prisma/client'
import type { z } from 'zod'
import { getCurrentUser } from '@/actions/get-current-user'
import {
  dispatchImportJob,
  importDispatchFailure,
} from '@/lib/server/import-queue'
import prisma from '@/prisma/client'
import { MAX_IMPORT_PAYLOAD_BYTES } from '@/schemas/gift-import'
import {
  IMPORT_REVIEW_PAGE_SIZE,
  JobDetailsSchema,
  JobIdSchema,
} from '@/schemas/import-job'

export type ImportPreviewRow = {
  rowNumber: number
  errors: string[]
  values: unknown
}

const INVALID_DATA = 'Datos de importación inválidos.'
const INVALID_JOB = 'Importación inválida.'
const INVALID_BLOCK = 'Bloque de importación inválido.'
const START_FAILED = 'No se pudo preparar la importación. Intentá nuevamente.'
const REVIEW_FAILED = 'No se pudo revisar la importación. Intentá nuevamente.'
const REVIEW_ROWS_FAILED = 'No se pudo cargar la revisión.'

export type ImportDraftMessages = {
  uploadFailed: string
  reviewChanged: string
  reviewHasErrors: string
  acceptHistory: string
  acceptFailed: string
}

type StartInput = {
  submissionId: string
  filename: string
  expectedRows: number
  createMissingCollections?: boolean
}
type UploadInput = {
  jobId: string
  offset: number
  rows: { rowNumber: number }[]
}
type AcceptInput = {
  jobId: string
  previewToken: string
  excludedRowNumbers: number[]
}

export type ImportDraftAdapter = {
  kind: ImportJobKind
  messages: ImportDraftMessages
  startSchema: z.ZodTypeAny
  uploadSchema: z.ZodTypeAny
  acceptSchema: z.ZodTypeAny
  resolveCreateMissingCollections: (data: StartInput) => boolean
  buildReview: (
    tx: Prisma.TransactionClient,
    savedRowInputs: unknown[],
    job: GiftImportJob
  ) => Promise<{ preview: ImportPreviewRow[]; previewToken: string }>
  saveReview: (
    tx: Prisma.TransactionClient,
    jobId: string,
    preview: ImportPreviewRow[]
  ) => Promise<void>
  extraAcceptGuard?: (
    includedRows: ImportPreviewRow[],
    input: AcceptInput
  ) => string | null
}

type UploadDraftResult =
  | { ok: true; error?: undefined }
  | { error: string; ok?: undefined }

type ReviewRowsDraftResult<T> =
  | { preview: T[]; previewToken: string; error?: undefined }
  | { error: string; preview?: undefined; previewToken?: undefined }

export type AcceptDraftResult =
  | {
      jobId: string
      error?: undefined
      previewToken?: undefined
      reviewChanged?: undefined
    }
  | {
      error: string
      jobId?: undefined
      previewToken?: undefined
      reviewChanged?: undefined
    }
  | {
      error: string
      jobId: string
      queueDispatchFailed: true
      previewToken?: undefined
    }
  | {
      error: string
      previewToken: string
      reviewChanged: true
      jobId?: undefined
    }

export async function startImportDraft(
  adapter: ImportDraftAdapter,
  input: unknown
) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = adapter.startSchema.safeParse(input)
  if (!parsed.success) return { error: INVALID_DATA } as const
  const data = parsed.data as StartInput
  const createMissingCollections = adapter.resolveCreateMissingCollections(data)
  const identityMatches = (job: GiftImportJob) =>
    job.submittedById === user.id &&
    job.kind === adapter.kind &&
    job.filename === data.filename &&
    job.expectedRows === data.expectedRows &&
    job.createMissingCollections === createMissingCollections
  try {
    const job = await prisma.giftImportJob.upsert({
      where: { submissionId: data.submissionId },
      update: {},
      create: {
        submissionId: data.submissionId,
        filename: data.filename,
        expectedRows: data.expectedRows,
        kind: adapter.kind,
        createMissingCollections,
        submittedById: user.id,
        submittedBy: user.name || user.email || user.id,
        lockExpiresAt: new Date(0),
      },
    })
    if (!identityMatches(job))
      return { error: 'La solicitud ya pertenece a otra importación.' } as const
    return { jobId: job.id } as const
  } catch {
    // Concurrent starts can lose the unique-index race after the same job was saved.
    const existing = await prisma.giftImportJob
      .findUnique({ where: { submissionId: data.submissionId } })
      .catch(() => null)
    if (existing && identityMatches(existing))
      return { jobId: existing.id } as const
    return { error: START_FAILED } as const
  }
}

export async function uploadImportRows(
  adapter: ImportDraftAdapter,
  input: unknown
): Promise<UploadDraftResult> {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' }
  const parsed = adapter.uploadSchema.safeParse(input)
  if (!parsed.success) return { error: INVALID_BLOCK }
  const { jobId, rows, offset } = parsed.data as UploadInput
  try {
    return await prisma.$transaction(async tx => {
      const job = await tx.giftImportJob.findUnique({ where: { id: jobId } })
      if (job?.kind !== adapter.kind || job.submittedById !== user.id)
        return { error: 'Importación no encontrada.' }
      if (offset < job.uploadedRows) {
        const saved = await tx.giftImportRow.findMany({
          where: { jobId, position: { gte: offset, lt: offset + rows.length } },
          orderBy: { position: 'asc' },
        })
        return saved.length === rows.length &&
          saved.every(
            (row, index) =>
              JSON.stringify(row.input) === JSON.stringify(rows[index])
          )
          ? { ok: true }
          : { error: 'El bloque ya guardado es diferente.' }
      }
      const bytes = Buffer.byteLength(JSON.stringify(rows))
      if (
        job.status !== 'PREPARING' ||
        job.previewToken ||
        job.uploadedRows !== offset ||
        offset + rows.length > job.expectedRows ||
        job.uploadedBytes + bytes > MAX_IMPORT_PAYLOAD_BYTES
      )
        return { error: 'La importación no admite este bloque.' }
      await tx.giftImportJob.update({
        where: { id: jobId },
        data: {
          uploadedRows: { increment: rows.length },
          uploadedBytes: { increment: bytes },
        },
      })
      await tx.giftImportRow.createMany({
        data: rows.map((row, index) => ({
          jobId,
          rowNumber: row.rowNumber,
          position: offset + index,
          input: row as Prisma.InputJsonValue,
        })),
      })
      return { ok: true }
    })
  } catch {
    return { error: adapter.messages.uploadFailed }
  }
}

export async function reviewImportDraft(
  adapter: ImportDraftAdapter,
  input: unknown
) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = JobIdSchema.safeParse(input)
  if (!parsed.success) return { error: INVALID_JOB } as const
  try {
    return await prisma.$transaction(
      async tx => {
        const job = await tx.giftImportJob.findUnique({
          where: { id: parsed.data },
        })
        if (
          job?.kind !== adapter.kind ||
          job.submittedById !== user.id ||
          job.status !== 'PREPARING' ||
          job.uploadedRows !== job.expectedRows
        )
          return { error: 'Esperá a que se guarden todas las filas.' } as const
        const saved = await tx.giftImportRow.findMany({
          where: { jobId: job.id },
          orderBy: { position: 'asc' },
        })
        const reviewed = await adapter.buildReview(
          tx,
          saved.map(row => row.input),
          job
        )
        await tx.giftImportJob.update({
          where: { id: job.id },
          data: { previewToken: reviewed.previewToken },
        })
        await adapter.saveReview(tx, job.id, reviewed.preview)
        return {
          previewToken: reviewed.previewToken,
          rowCount: reviewed.preview.length,
        } as const
      },
      { timeout: 30000 }
    )
  } catch {
    return { error: REVIEW_FAILED } as const
  }
}

export async function getImportReviewRows<T extends ImportPreviewRow>(
  adapter: ImportDraftAdapter,
  input: unknown
): Promise<ReviewRowsDraftResult<T>> {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' }
  const parsed = JobDetailsSchema.safeParse(input)
  if (!parsed.success) return { error: INVALID_JOB }
  try {
    const job = await prisma.giftImportJob.findUnique({
      where: { id: parsed.data.jobId },
    })
    if (
      job?.kind !== adapter.kind ||
      job.submittedById !== user.id ||
      !job.previewToken ||
      job.status !== 'PREPARING'
    )
      return { error: 'Revisión no disponible.' }
    const rows = await prisma.giftImportRow.findMany({
      where: { jobId: job.id },
      orderBy: { position: 'asc' },
      skip: parsed.data.page * IMPORT_REVIEW_PAGE_SIZE,
      take: IMPORT_REVIEW_PAGE_SIZE,
      select: { review: true },
    })
    return {
      preview: rows.map(row => row.review as unknown as T),
      previewToken: job.previewToken,
    }
  } catch {
    return { error: REVIEW_ROWS_FAILED }
  }
}

export async function acceptImportDraft(
  adapter: ImportDraftAdapter,
  input: unknown
): Promise<AcceptDraftResult> {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' }
  const parsed = adapter.acceptSchema.safeParse(input)
  if (!parsed.success) return { error: INVALID_DATA }
  const accept = parsed.data as AcceptInput
  try {
    const result = await prisma.$transaction(
      async tx => {
        const job = await tx.giftImportJob.findUnique({
          where: { id: accept.jobId },
        })
        if (job?.kind !== adapter.kind || job.submittedById !== user.id)
          return { error: 'Importación no encontrada.' } as const
        if (job.acceptedAt && job.status === 'FAILED')
          return importDispatchFailure(job.id)
        if (job.acceptedAt)
          return { jobId: job.id, runId: job.runId, dispatch: false } as const
        if (
          job.status !== 'PREPARING' ||
          job.uploadedRows !== job.expectedRows ||
          job.previewToken !== accept.previewToken
        )
          return { error: 'Volvé a revisar la importación.' } as const
        const saved = await tx.giftImportRow.findMany({
          where: { jobId: job.id },
          orderBy: { position: 'asc' },
        })
        const fresh = await adapter.buildReview(
          tx,
          saved.map(row => row.input),
          job
        )
        if (fresh.previewToken !== accept.previewToken) {
          await tx.giftImportJob.update({
            where: { id: job.id },
            data: { previewToken: fresh.previewToken },
          })
          await adapter.saveReview(tx, job.id, fresh.preview)
          return {
            error: adapter.messages.reviewChanged,
            previewToken: fresh.previewToken,
            reviewChanged: true,
          } as const
        }
        const excluded = new Set(accept.excludedRowNumbers)
        const included = fresh.preview.filter(
          row => !excluded.has(row.rowNumber)
        )
        if (
          !included.length ||
          included.some(row => row.errors.length || !row.values) ||
          Array.from(excluded).some(
            n => !fresh.preview.some(row => row.rowNumber === n)
          )
        )
          return { error: adapter.messages.reviewHasErrors } as const
        const blocked = adapter.extraAcceptGuard?.(included, accept)
        if (blocked) return { error: blocked } as const
        await tx.giftImportRow.updateMany({
          where: { jobId: job.id, rowNumber: { in: Array.from(excluded) } },
          data: {
            excluded: true,
            status: 'SKIPPED',
            error: 'Excluida durante la revisión.',
          },
        })
        const runId = randomUUID()
        await tx.giftImportJob.update({
          where: { id: job.id },
          data: {
            status: 'QUEUED',
            acceptedAt: new Date(),
            runId,
            skippedCount: excluded.size,
          },
        })
        await tx.giftImportHistory.create({
          data: {
            jobId: job.id,
            attemptId: runId,
            message: adapter.messages.acceptHistory,
          },
        })
        return { jobId: job.id, runId, dispatch: true } as const
      },
      { timeout: 30000 }
    )
    if ('error' in result) return result
    if (result.dispatch) {
      try {
        await dispatchImportJob(result.jobId, result.runId, adapter.kind)
      } catch {
        return importDispatchFailure(result.jobId)
      }
    }
    return { jobId: result.jobId }
  } catch {
    const existing = await prisma.giftImportJob
      .findUnique({ where: { id: accept.jobId } })
      .catch(() => null)
    if (existing?.submittedById === user.id && existing.acceptedAt)
      return existing.status === 'FAILED'
        ? importDispatchFailure(existing.id)
        : { jobId: existing.id }
    return { error: adapter.messages.acceptFailed }
  }
}
