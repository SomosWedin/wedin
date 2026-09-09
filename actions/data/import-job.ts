'use server'

import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/actions/get-current-user'
import { dispatchImportJob } from '@/lib/server/import-queue'
import prisma from '@/prisma/client'
import type { GiftImportPreviewRow } from '@/schemas/gift-import'
import { GiftImportRowsSchema } from '@/schemas/gift-import'
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
import {
  acceptImportDraft,
  getImportReviewRows,
  type ImportDraftAdapter,
  reviewImportDraft,
  startImportDraft,
  uploadImportRows,
} from './import-draft'

const giftDraftAdapter: ImportDraftAdapter = {
  kind: 'GIFT',
  startSchema: StartImportJobSchema,
  uploadSchema: UploadImportRowsSchema,
  acceptSchema: AcceptImportJobSchema,
  resolveCreateMissingCollections: data =>
    data.createMissingCollections ?? false,
  buildReview: async (tx, savedRowInputs, job) => {
    const rows = GiftImportRowsSchema.parse(savedRowInputs)
    return reviewResult(
      await previewRows(tx, rows, job.createMissingCollections)
    )
  },
  saveReview: (tx, jobId, preview) => saveImportReview(tx, jobId, preview),
  messages: {
    uploadFailed: 'No se pudo guardar el bloque. Intentá nuevamente.',
    reviewChanged:
      'El catálogo cambió desde la revisión. Revisá los datos actualizados antes de aceptar.',
    reviewHasErrors:
      'La revisión tiene errores. Seleccioná al menos un regalo válido.',
    acceptHistory: 'Importación aceptada y guardada.',
    acceptFailed:
      'No se pudo poner la importación en cola. Revisá su estado en Trabajos; podés reintentar sin duplicar regalos.',
  },
}

export async function startAdminImportJob(input: unknown) {
  return startImportDraft(giftDraftAdapter, input)
}

export async function uploadAdminImportRows(input: unknown) {
  return uploadImportRows(giftDraftAdapter, input)
}

export async function reviewAdminImportJob(input: unknown) {
  return reviewImportDraft(giftDraftAdapter, input)
}

export async function getAdminImportReviewRows(input: unknown) {
  return getImportReviewRows<GiftImportPreviewRow>(giftDraftAdapter, input)
}

export async function acceptAdminGiftImport(input: unknown) {
  return acceptImportDraft(giftDraftAdapter, input)
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
        select: {
          id: true,
          rowNumber: true,
          input: true,
          review: true,
          status: true,
          giftId: true,
          excluded: true,
          error: true,
        },
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
