import { randomUUID } from 'node:crypto'
import type {
  GiftImportJob,
  GiftImportRow,
  ImportJobKind,
  Prisma,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { dispatchImportJob } from '@/lib/server/import-queue'
import prisma from '@/prisma/client'
import {
  IMPORT_LEASE_MS,
  ImportBusyError,
  renewImportLease,
} from './import-job-lease'

export type ProcessedRow = {
  status: 'CREATED' | 'UPDATED' | 'SKIPPED'
  giftId?: string
  collectionId?: string
  historyMessage: string
}

export type RowProcessor<Ctx = undefined> = {
  kind: ImportJobKind
  startMessage: string
  temporaryErrorMessage: string
  isRowValidationError: (error: unknown) => error is Error
  prepare?: (
    client: typeof prisma,
    rows: GiftImportRow[],
    job: GiftImportJob
  ) => Promise<Ctx>
  processRow: (
    tx: Prisma.TransactionClient,
    row: GiftImportRow,
    job: GiftImportJob,
    context: Ctx
  ) => Promise<ProcessedRow>
}

const COUNTER: Record<ProcessedRow['status'], keyof GiftImportJob> = {
  CREATED: 'createdCount',
  UPDATED: 'updatedCount',
  SKIPPED: 'skippedCount',
}

export async function runImportJob<Ctx>(
  processor: RowProcessor<Ctx>,
  jobId: string,
  runId: string,
  deliveryAttempt = 0
) {
  const attemptId = randomUUID()
  const started = Date.now()
  const acquired = await prisma.giftImportJob.updateMany({
    where: {
      id: jobId,
      kind: processor.kind,
      runId,
      acceptedAt: { not: null },
      status: { in: ['QUEUED', 'PROCESSING', 'FAILED'] },
      lockExpiresAt: { lte: new Date() },
    },
    data: {
      status: 'PROCESSING',
      lockOwner: attemptId,
      lockExpiresAt: new Date(Date.now() + IMPORT_LEASE_MS),
    },
  })
  if (!acquired.count) {
    const job = await prisma.giftImportJob.findUnique({ where: { id: jobId } })
    if (job?.runId === runId && job.lockExpiresAt > new Date())
      throw new ImportBusyError('Worker active')
    return
  }
  try {
    const job = await prisma.giftImportJob.findUniqueOrThrow({
      where: { id: jobId },
    })
    await prisma.giftImportJob.update({
      where: { id: jobId },
      data: { startedAt: job.startedAt || new Date() },
    })
    await prisma.giftImportHistory.create({
      data: {
        jobId,
        attemptId,
        message: deliveryAttempt
          ? `Reintento automático ${Math.min(deliveryAttempt, 3)} de 3.`
          : processor.startMessage,
      },
    })
    const rows = await prisma.giftImportRow.findMany({
      where: { jobId, status: 'PENDING', excluded: false },
      orderBy: { position: 'asc' },
      take: 50,
    })
    const context = (await processor.prepare?.(prisma, rows, job)) as Ctx
    for (const row of rows) {
      if (Date.now() - started > 20_000) break
      try {
        await prisma.$transaction(
          async tx => {
            await renewImportLease(tx, jobId, runId, attemptId, processor.kind)
            const result = await processor.processRow(tx, row, job, context)
            await tx.giftImportRow.update({
              where: { id: row.id },
              data: {
                status: result.status,
                giftId: result.giftId,
                collectionId: result.collectionId,
                error: null,
                attempts: { increment: 1 },
              },
            })
            await tx.giftImportJob.update({
              where: { id: jobId },
              data: { [COUNTER[result.status]]: { increment: 1 } },
            })
            await tx.giftImportHistory.create({
              data: {
                jobId,
                rowNumber: row.rowNumber,
                attemptId,
                message: result.historyMessage,
              },
            })
          },
          { timeout: 15000 }
        )
      } catch (error) {
        if (!processor.isRowValidationError(error)) throw error
        await prisma.$transaction(async tx => {
          await renewImportLease(tx, jobId, runId, attemptId, processor.kind)
          await tx.giftImportRow.update({
            where: { id: row.id },
            data: {
              status: 'FAILED',
              error: error.message,
              attempts: { increment: 1 },
            },
          })
          await tx.giftImportJob.update({
            where: { id: jobId },
            data: { failedCount: { increment: 1 } },
          })
          await tx.giftImportHistory.create({
            data: {
              jobId,
              rowNumber: row.rowNumber,
              attemptId,
              message: error.message,
            },
          })
        })
      }
    }
    const pending = await prisma.$transaction(async tx => {
      await renewImportLease(tx, jobId, runId, attemptId, processor.kind)
      const count = await tx.giftImportRow.count({
        where: { jobId, status: 'PENDING', excluded: false },
      })
      const current = await tx.giftImportJob.findUniqueOrThrow({
        where: { id: jobId },
      })
      await tx.giftImportJob.update({
        where: { id: jobId },
        data: {
          status: count
            ? 'QUEUED'
            : current.failedCount
              ? 'COMPLETED_WITH_ERRORS'
              : 'COMPLETED',
          completedAt: count ? null : new Date(),
          lockOwner: '',
          lockExpiresAt: new Date(0),
        },
      })
      if (!count)
        await tx.giftImportHistory.create({
          data: { jobId, attemptId, message: 'Importación finalizada.' },
        })
      return count
    })
    revalidatePath('/admin')
    revalidatePath('/gifts')
    revalidatePath('/wishlist')
    if (pending)
      await (processor.kind === 'GIFT'
        ? dispatchImportJob(jobId, runId)
        : dispatchImportJob(jobId, runId, processor.kind))
  } catch (error) {
    await prisma.$transaction(async tx => {
      const changed = await tx.giftImportJob.updateMany({
        where: { id: jobId, runId, lockOwner: attemptId },
        data: { status: 'QUEUED', lockOwner: '', lockExpiresAt: new Date(0) },
      })
      if (changed.count)
        await tx.giftImportHistory.create({
          data: { jobId, attemptId, message: processor.temporaryErrorMessage },
        })
    })
    throw error
  }
}

export async function recordImportDeliveryFailure(
  jobId: string,
  runId: string
) {
  await prisma.$transaction(async tx => {
    const changed = await tx.giftImportJob.updateMany({
      where: { id: jobId, runId, status: { in: ['QUEUED', 'PROCESSING'] } },
      // Exhaustion can arrive before the final worker lease expires. Preserve that lease.
      data: { status: 'FAILED' },
    })
    if (changed.count)
      await tx.giftImportHistory.create({
        data: {
          jobId,
          attemptId: runId,
          message:
            'Se agotaron los reintentos de entrega. Reintentá los pendientes desde Trabajos.',
        },
      })
  })
}
