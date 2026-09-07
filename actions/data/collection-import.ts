'use server'

import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/actions/get-current-user'
import { dispatchImportJob } from '@/lib/server/import-queue'
import prisma from '@/prisma/client'
import {
  type CollectionImportPreviewRow,
  CollectionImportRowsSchema,
} from '@/schemas/collection-import'
import { MAX_IMPORT_PAYLOAD_BYTES } from '@/schemas/gift-import'
import {
  AcceptCollectionImportJobSchema,
  JobDetailsSchema,
  JobIdSchema,
  StartCollectionImportJobSchema,
  UploadCollectionImportRowsSchema,
} from '@/schemas/import-job'
import {
  collectionReviewResult,
  previewCollectionRows,
  saveCollectionImportReview,
} from './collection-import-preview'

export async function startAdminCollectionImportJob(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = StartCollectionImportJobSchema.safeParse(input)
  if (!parsed.success)
    return { error: 'Datos de importación inválidos.' } as const
  try {
    const job = await prisma.giftImportJob.upsert({
      where: { submissionId: parsed.data.submissionId },
      update: {},
      create: {
        ...parsed.data,
        kind: 'COLLECTION',
        createMissingCollections: false,
        submittedById: user.id,
        submittedBy: user.name || user.email || user.id,
        lockExpiresAt: new Date(0),
      },
    })
    if (
      job.submittedById !== user.id ||
      job.kind !== 'COLLECTION' ||
      job.filename !== parsed.data.filename ||
      job.expectedRows !== parsed.data.expectedRows
    )
      return { error: 'La solicitud ya pertenece a otra importación.' } as const
    return { jobId: job.id } as const
  } catch {
    const existing = await prisma.giftImportJob
      .findUnique({ where: { submissionId: parsed.data.submissionId } })
      .catch(() => null)
    if (
      existing?.submittedById === user.id &&
      existing.kind === 'COLLECTION' &&
      existing.filename === parsed.data.filename &&
      existing.expectedRows === parsed.data.expectedRows
    )
      return { jobId: existing.id } as const
    return { error: 'No se pudo preparar la importación.' } as const
  }
}

export async function uploadAdminCollectionImportRows(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = UploadCollectionImportRowsSchema.safeParse(input)
  if (!parsed.success)
    return { error: 'Bloque de importación inválido.' } as const
  const { jobId, rows, offset } = parsed.data
  try {
    return await prisma.$transaction(async tx => {
      const job = await tx.giftImportJob.findUnique({ where: { id: jobId } })
      if (job?.kind !== 'COLLECTION' || job.submittedById !== user.id)
        return { error: 'Importación no encontrada.' } as const
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
          ? ({ ok: true } as const)
          : ({ error: 'El bloque ya guardado es diferente.' } as const)
      }
      const bytes = Buffer.byteLength(JSON.stringify(rows))
      if (
        job.status !== 'PREPARING' ||
        job.previewToken ||
        job.uploadedRows !== offset ||
        offset + rows.length > job.expectedRows ||
        job.uploadedBytes + bytes > MAX_IMPORT_PAYLOAD_BYTES
      )
        return { error: 'La importación no admite este bloque.' } as const
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
          input: row,
        })),
      })
      return { ok: true } as const
    })
  } catch {
    return { error: 'No se pudo guardar el bloque.' } as const
  }
}

export async function reviewAdminCollectionImportJob(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = JobIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Importación inválida.' } as const
  try {
    return await prisma.$transaction(
      async tx => {
        const job = await tx.giftImportJob.findUnique({
          where: { id: parsed.data },
        })
        if (
          job?.kind !== 'COLLECTION' ||
          job.submittedById !== user.id ||
          job.status !== 'PREPARING' ||
          job.uploadedRows !== job.expectedRows
        )
          return { error: 'Esperá a que se guarden todas las filas.' } as const
        const saved = await tx.giftImportRow.findMany({
          where: { jobId: job.id },
          orderBy: { position: 'asc' },
        })
        const rows = CollectionImportRowsSchema.parse(
          saved.map(row => row.input)
        )
        const reviewed = collectionReviewResult(
          await previewCollectionRows(tx, rows)
        )
        await tx.giftImportJob.update({
          where: { id: job.id },
          data: { previewToken: reviewed.previewToken },
        })
        await saveCollectionImportReview(tx, job.id, reviewed.preview)
        return {
          previewToken: reviewed.previewToken,
          rowCount: reviewed.preview.length,
        } as const
      },
      { timeout: 30000 }
    )
  } catch {
    return { error: 'No se pudo revisar la importación.' } as const
  }
}

export async function getAdminCollectionImportReviewRows(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = JobDetailsSchema.safeParse(input)
  if (!parsed.success) return { error: 'Importación inválida.' } as const
  try {
    const job = await prisma.giftImportJob.findUnique({
      where: { id: parsed.data.jobId },
    })
    if (
      job?.kind !== 'COLLECTION' ||
      job.submittedById !== user.id ||
      !job.previewToken ||
      job.status !== 'PREPARING'
    )
      return { error: 'Revisión no disponible.' } as const
    const rows = await prisma.giftImportRow.findMany({
      where: { jobId: job.id },
      orderBy: { position: 'asc' },
      skip: parsed.data.page * 10,
      take: 10,
      select: { review: true },
    })
    return {
      preview: rows.map(
        row => row.review as unknown as CollectionImportPreviewRow
      ),
      previewToken: job.previewToken,
    } as const
  } catch {
    return { error: 'No se pudo cargar la revisión.' } as const
  }
}

export async function acceptAdminCollectionImport(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = AcceptCollectionImportJobSchema.safeParse(input)
  if (!parsed.success)
    return { error: 'Datos de importación inválidos.' } as const
  try {
    const result = await prisma.$transaction(
      async tx => {
        const job = await tx.giftImportJob.findUnique({
          where: { id: parsed.data.jobId },
        })
        if (job?.kind !== 'COLLECTION' || job.submittedById !== user.id)
          return { error: 'Importación no encontrada.' } as const
        if (job.acceptedAt)
          return { jobId: job.id, runId: job.runId, dispatch: false } as const
        if (
          job.status !== 'PREPARING' ||
          job.uploadedRows !== job.expectedRows ||
          job.previewToken !== parsed.data.previewToken
        )
          return { error: 'Volvé a revisar la importación.' } as const
        const saved = await tx.giftImportRow.findMany({
          where: { jobId: job.id },
          orderBy: { position: 'asc' },
        })
        const rows = CollectionImportRowsSchema.parse(
          saved.map(row => row.input)
        )
        const fresh = collectionReviewResult(
          await previewCollectionRows(tx, rows)
        )
        if (fresh.previewToken !== parsed.data.previewToken) {
          await tx.giftImportJob.update({
            where: { id: job.id },
            data: { previewToken: fresh.previewToken },
          })
          await saveCollectionImportReview(tx, job.id, fresh.preview)
          return {
            error:
              'El catálogo cambió desde la revisión. Revisá los cambios actualizados.',
            previewToken: fresh.previewToken,
            reviewChanged: true,
          } as const
        }
        const excluded = new Set(parsed.data.excludedRowNumbers)
        const included = fresh.preview.filter(
          row => !excluded.has(row.rowNumber)
        )
        if (
          !included.length ||
          included.some(row => row.errors.length || !row.values) ||
          Array.from(excluded).some(
            rowNumber => !rows.some(row => row.rowNumber === rowNumber)
          )
        )
          return {
            error:
              'La revisión tiene errores. Dejá al menos una colección válida.',
          } as const
        if (
          included.some(row => row.removed.length) &&
          !parsed.data.acknowledgeRemovals
        )
          return { error: 'Confirmá los regalos que se quitarán.' } as const
        if (
          included.some(row => row.ignored.length) &&
          !parsed.data.acknowledgeIgnored
        )
          return {
            error: 'Confirmá las referencias que se ignorarán.',
          } as const
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
            message: 'Importación de colecciones aceptada y guardada.',
          },
        })
        return { jobId: job.id, runId, dispatch: true } as const
      },
      { timeout: 30000 }
    )
    if ('error' in result) return result
    if (result.dispatch)
      await dispatchImportJob(result.jobId, result.runId, 'COLLECTION')
    return { jobId: result.jobId } as const
  } catch {
    return {
      error:
        'No se pudo poner la importación en cola. Revisá su estado en Trabajos.',
    } as const
  }
}
