'use server'

import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/actions/get-current-user'
import {
  dispatchImportJob,
  importDispatchFailure,
} from '@/lib/server/import-queue'
import prisma from '@/prisma/client'
import {
  GiftImportRowsSchema,
  MAX_IMPORT_PAYLOAD_BYTES,
} from '@/schemas/gift-import'
import {
  AcceptImportJobSchema,
  JobDetailsSchema,
  JobIdSchema,
  JobListSchema,
  StartImportJobSchema,
  UploadImportRowsSchema,
} from '@/schemas/import-job'
import {
  previewRows,
  reviewResult,
  saveImportReview,
} from './gift-import-preview'

export async function startAdminImportJob(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = StartImportJobSchema.safeParse(input)
  if (!parsed.success)
    return { error: 'Datos de importación inválidos.' } as const
  try {
    const job = await prisma.giftImportJob.upsert({
      where: { submissionId: parsed.data.submissionId },
      update: {},
      create: {
        ...parsed.data,
        kind: 'GIFT',
        submittedById: user.id,
        submittedBy: user.name || user.email || user.id,
        lockExpiresAt: new Date(0),
      },
    })
    if (
      job.submittedById !== user.id ||
      job.kind !== 'GIFT' ||
      job.filename !== parsed.data.filename ||
      job.expectedRows !== parsed.data.expectedRows ||
      job.createMissingCollections !== parsed.data.createMissingCollections
    )
      return { error: 'La solicitud ya pertenece a otra importación.' } as const
    return { jobId: job.id } as const
  } catch {
    // Concurrent starts can lose the unique-index race after the same job was saved.
    const existing = await prisma.giftImportJob
      .findUnique({ where: { submissionId: parsed.data.submissionId } })
      .catch(() => null)
    if (
      existing?.submittedById === user.id &&
      existing.kind === 'GIFT' &&
      existing.filename === parsed.data.filename &&
      existing.expectedRows === parsed.data.expectedRows &&
      existing.createMissingCollections === parsed.data.createMissingCollections
    )
      return { jobId: existing.id } as const
    return {
      error: 'No se pudo preparar la importación. Intentá nuevamente.',
    } as const
  }
}

export async function uploadAdminImportRows(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = UploadImportRowsSchema.safeParse(input)
  if (!parsed.success)
    return { error: 'Bloque de importación inválido.' } as const
  const { jobId, rows, offset } = parsed.data
  try {
    return await prisma.$transaction(async tx => {
      const job = await tx.giftImportJob.findUnique({ where: { id: jobId } })
      if (job?.kind !== 'GIFT' || job.submittedById !== user.id)
        return { error: 'Importación no encontrada.' } as const
      if (offset < job.uploadedRows) {
        const saved = await tx.giftImportRow.findMany({
          where: { jobId, position: { gte: offset, lt: offset + rows.length } },
          orderBy: { position: 'asc' },
        })
        return saved.length === rows.length &&
          saved.every(
            (row, i) => JSON.stringify(row.input) === JSON.stringify(rows[i])
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
        data: rows.map((row, i) => ({
          jobId,
          rowNumber: row.rowNumber,
          position: offset + i,
          input: row,
        })),
      })
      return { ok: true } as const
    })
  } catch {
    return {
      error: 'No se pudo guardar el bloque. Intentá nuevamente.',
    } as const
  }
}

export async function reviewAdminImportJob(input: unknown) {
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
          job?.kind !== 'GIFT' ||
          job.submittedById !== user.id ||
          job.status !== 'PREPARING' ||
          job.uploadedRows !== job.expectedRows
        )
          return { error: 'Esperá a que se guarden todas las filas.' } as const
        const saved = await tx.giftImportRow.findMany({
          where: { jobId: job.id },
          orderBy: { position: 'asc' },
        })
        const rows = GiftImportRowsSchema.parse(saved.map(row => row.input))
        const reviewed = reviewResult(
          await previewRows(tx, rows, job.createMissingCollections)
        )
        await tx.giftImportJob.update({
          where: { id: job.id },
          data: { previewToken: reviewed.previewToken },
        })
        await saveImportReview(tx, job.id, reviewed.preview)
        return {
          previewToken: reviewed.previewToken,
          rowCount: reviewed.preview.length,
        }
      },
      { timeout: 30000 }
    )
  } catch {
    return {
      error: 'No se pudo revisar la importación. Intentá nuevamente.',
    } as const
  }
}

export async function getAdminImportReviewRows(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = JobDetailsSchema.safeParse(input)
  if (!parsed.success) return { error: 'Importación inválida.' } as const
  try {
    const job = await prisma.giftImportJob.findUnique({
      where: { id: parsed.data.jobId },
    })
    if (
      job?.kind !== 'GIFT' ||
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
        row =>
          row.review as unknown as import('@/schemas/gift-import').GiftImportPreviewRow
      ),
      previewToken: job.previewToken,
    } as const
  } catch {
    return { error: 'No se pudo cargar la revisión.' } as const
  }
}

export async function acceptAdminGiftImport(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = AcceptImportJobSchema.safeParse(input)
  if (!parsed.success)
    return { error: 'Datos de importación inválidos.' } as const
  try {
    const result = await prisma.$transaction(
      async tx => {
        const job = await tx.giftImportJob.findUnique({
          where: { id: parsed.data.jobId },
        })
        if (job?.kind !== 'GIFT' || job.submittedById !== user.id)
          return { error: 'Importación no encontrada.' } as const
        if (job.acceptedAt && job.status === 'FAILED')
          return importDispatchFailure(job.id)
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
        const rows = GiftImportRowsSchema.parse(saved.map(row => row.input))
        const fresh = reviewResult(
          await previewRows(tx, rows, job.createMissingCollections)
        )
        if (fresh.previewToken !== parsed.data.previewToken) {
          await tx.giftImportJob.update({
            where: { id: job.id },
            data: { previewToken: fresh.previewToken },
          })
          await saveImportReview(tx, job.id, fresh.preview)
          return {
            error:
              'El catálogo cambió desde la revisión. Revisá los datos actualizados antes de aceptar.',
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
          Array.from(excluded).some(n => !rows.some(row => row.rowNumber === n))
        )
          return {
            error:
              'La revisión tiene errores. Seleccioná al menos un regalo válido.',
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
            message: 'Importación aceptada y guardada.',
          },
        })
        return { jobId: job.id, runId, dispatch: true } as const
      },
      { timeout: 30000 }
    )
    if ('error' in result) return result
    if (result.dispatch) {
      try {
        await dispatchImportJob(result.jobId, result.runId)
      } catch {
        return importDispatchFailure(result.jobId)
      }
    }
    return { jobId: result.jobId } as const
  } catch {
    const existing = await prisma.giftImportJob
      .findUnique({ where: { id: parsed.data.jobId } })
      .catch(() => null)
    if (existing?.submittedById === user.id && existing.acceptedAt)
      return existing.status === 'FAILED'
        ? importDispatchFailure(existing.id)
        : ({ jobId: existing.id } as const)
    return {
      error:
        'No se pudo poner la importación en cola. Revisá su estado en Trabajos; podés reintentar sin duplicar regalos.',
    } as const
  }
}

export async function getAdminImportJobs(input: unknown) {
  if ((await getCurrentUser())?.role !== 'ADMIN')
    return { error: 'No autorizado.' } as const
  const parsed = JobListSchema.safeParse(input)
  if (!parsed.success) return { error: 'Filtros inválidos.' } as const
  const { page, search, status, kind } = parsed.data
  const where = {
    ...(status ? { status } : {}),
    ...(kind ? { kind } : {}),
    ...(search
      ? { filename: { contains: search, mode: 'insensitive' as const } }
      : {}),
  }
  try {
    const [jobs, total] = await Promise.all([
      prisma.giftImportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * 20,
        take: 20,
      }),
      prisma.giftImportJob.count({ where }),
    ])
    return { jobs, total } as const
  } catch {
    return { error: 'No se pudieron cargar los trabajos.' } as const
  }
}

export async function getAdminImportJobDetails(input: unknown) {
  if ((await getCurrentUser())?.role !== 'ADMIN')
    return { error: 'No autorizado.' } as const
  const parsed = JobDetailsSchema.safeParse(input)
  if (!parsed.success) return { error: 'Importación inválida.' } as const
  const { jobId, page, historyPage } = parsed.data
  try {
    const [job, rows, history, historyTotal] = await Promise.all([
      prisma.giftImportJob.findUnique({ where: { id: jobId } }),
      prisma.giftImportRow.findMany({
        where: { jobId },
        orderBy: { position: 'asc' },
        skip: page * 20,
        take: 20,
      }),
      prisma.giftImportHistory.findMany({
        where: { jobId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: historyPage * 20,
        take: 20,
      }),
      prisma.giftImportHistory.count({ where: { jobId } }),
    ])
    if (!job) return { error: 'Importación no encontrada.' } as const
    return { job, rows, history, historyTotal } as const
  } catch {
    return { error: 'No se pudieron cargar los detalles.' } as const
  }
}

export async function cancelAdminImportJob(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = JobIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Importación inválida.' } as const
  try {
    return await prisma.$transaction(async tx => {
      const job = await tx.giftImportJob.findUnique({
        where: { id: parsed.data },
      })
      if (!job) return { error: 'Importación no encontrada.' } as const
      if (job.status === 'CANCELLED') return { ok: true } as const
      if (job.status !== 'PREPARING' || job.acceptedAt)
        return {
          error: 'La importación ya fue aceptada y no se puede cancelar.',
        } as const
      const cancelledAt = new Date()
      await tx.giftImportJob.update({
        where: { id: job.id },
        data: { status: 'CANCELLED', completedAt: cancelledAt },
      })
      await tx.giftImportHistory.create({
        data: {
          jobId: job.id,
          attemptId: randomUUID(),
          message: `Preparación cancelada por ${user.name || user.email || user.id} antes de aceptar la importación.`,
        },
      })
      return { ok: true } as const
    })
  } catch {
    return { error: 'No se pudo cancelar la preparación.' } as const
  }
}

export async function retryAdminImportJob(input: unknown) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') return { error: 'No autorizado.' } as const
  const parsed = JobIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Importación inválida.' } as const
  const runId = randomUUID()
  try {
    const result = await prisma.$transaction(async tx => {
      const job = await tx.giftImportJob.findUnique({
        where: { id: parsed.data },
      })
      if (
        !job?.acceptedAt ||
        job.status === 'COMPLETED' ||
        job.lockExpiresAt > new Date()
      )
        return {
          error: 'El trabajo está activo o no tiene filas para reintentar.',
        } as const
      await tx.giftImportRow.updateMany({
        where: { jobId: job.id, status: 'FAILED', excluded: false },
        data: { status: 'PENDING', error: null },
      })
      await tx.giftImportJob.update({
        where: { id: job.id },
        data: {
          status: 'QUEUED',
          failedCount: 0,
          runId,
          lockOwner: '',
          lockExpiresAt: new Date(0),
          completedAt: null,
        },
      })
      await tx.giftImportHistory.create({
        data: {
          jobId: job.id,
          attemptId: runId,
          message: `Reintento solicitado por ${user.name || user.email || user.id}. Se conserva el trabajo completado.`,
        },
      })
      return { jobId: job.id, kind: job.kind } as const
    })
    if ('error' in result) return result
    await dispatchImportJob(result.jobId, runId, result.kind)
    return { ok: true } as const
  } catch {
    return {
      error: 'No se pudo enviar el trabajo. Podés reintentar desde esta tabla.',
    } as const
  }
}
