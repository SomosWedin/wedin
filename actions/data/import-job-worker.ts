import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { dispatchImportJob } from '@/lib/server/import-queue'
import prisma from '@/prisma/client'
import {
  type GiftImportPreviewRow,
  GiftImportRowSchema,
} from '@/schemas/gift-import'
import { previewRows } from './gift-import-preview'
import { CategoryNotFoundError, createGiftRecord } from './gift-operations'
import {
  GiftlistSelectionError,
  validateGiftlistIdsForCreate,
} from './giftlist-operations'

export const IMPORT_LEASE_MS = 90_000
export class ImportBusyError extends Error {}
class RowValidationError extends Error {}

async function fence(
  tx: Prisma.TransactionClient,
  jobId: string,
  runId: string,
  attemptId: string
) {
  const changed = await tx.giftImportJob.updateMany({
    where: {
      id: jobId,
      runId,
      lockOwner: attemptId,
      lockExpiresAt: { gt: new Date() },
    },
    data: { lockExpiresAt: new Date(Date.now() + IMPORT_LEASE_MS) },
  })
  if (!changed.count) throw new ImportBusyError('Worker lease expired')
}

export async function processImportJob(
  jobId: string,
  runId: string,
  deliveryAttempt = 0
) {
  const attemptId = randomUUID()
  const started = Date.now()
  const acquired = await prisma.giftImportJob.updateMany({
    where: {
      id: jobId,
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
          : 'Procesamiento de lote iniciado.',
      },
    })
    const rows = await prisma.giftImportRow.findMany({
      where: { jobId, status: 'PENDING', excluded: false },
      orderBy: { position: 'asc' },
      take: 50,
    })
    for (const row of rows) {
      if (Date.now() - started > 20_000) break
      try {
        await prisma.$transaction(
          async tx => {
            await fence(tx, jobId, runId, attemptId)
            const input = GiftImportRowSchema.parse(row.input)
            const accepted =
              row.review as unknown as GiftImportPreviewRow | null
            if (!accepted?.values)
              throw new RowValidationError(
                'La fila no tiene una revisión válida guardada.'
              )
            input.category = accepted.values.categoryId
            input.collections = [
              ...accepted.values.giftlistIds,
              ...accepted.values.newGiftlistNames,
            ].join('|')
            const [reviewed] = await previewRows(
              tx,
              [input],
              job.createMissingCollections
            )
            let giftId = reviewed.existingGiftId
            if (!giftId) {
              // A removed reviewed collection must never become a new collection named after its ID.
              await validateGiftlistIdsForCreate(
                tx,
                accepted.values.giftlistIds,
                accepted.values.categoryId
              )
              if (reviewed.errors.length || !reviewed.values)
                throw new RowValidationError(
                  reviewed.errors.some(message =>
                    message.includes('compartirían un tipo de evento')
                  )
                    ? 'Los regalos ya no comparten un tipo de evento con la colección.'
                    : reviewed.errors.some(message =>
                          message.includes('Categoría sin coincidencia')
                        )
                      ? 'La categoría revisada ya no existe.'
                      : reviewed.errors.some(
                            message =>
                              message.includes('tipo') ||
                              message.includes('Tipo')
                          )
                        ? 'Revisá los tipos de evento: cambiaron los tipos disponibles o admitidos por la categoría.'
                        : 'La fila ya no pasa la validación. Revisá el nombre, precio, imagen y las colecciones guardadas.'
                )
              const { giftlistIds, newGiftlistNames, ...values } =
                reviewed.values
              const collectionIds = [...giftlistIds]
              for (const name of newGiftlistNames) {
                const collection = await tx.giftlist.upsert({
                  where: { normalizedName: name.toLocaleLowerCase('es-PY') },
                  update: {},
                  create: {
                    name,
                    normalizedName: name.toLocaleLowerCase('es-PY'),
                  },
                })
                collectionIds.push(collection.id)
              }
              const compatibleIds = await validateGiftlistIdsForCreate(
                tx,
                collectionIds,
                values.categoryId
              )
              giftId = (
                await createGiftRecord(
                  tx,
                  { ...values, isDefault: true },
                  compatibleIds
                )
              ).id
            }
            const skipped = Boolean(reviewed.existingGiftId)
            await tx.giftImportRow.update({
              where: { id: row.id },
              data: {
                status: skipped ? 'SKIPPED' : 'CREATED',
                giftId,
                error: null,
                attempts: { increment: 1 },
              },
            })
            await tx.giftImportJob.update({
              where: { id: jobId },
              data: skipped
                ? { skippedCount: { increment: 1 } }
                : { createdCount: { increment: 1 } },
            })
            await tx.giftImportHistory.create({
              data: {
                jobId,
                rowNumber: row.rowNumber,
                attemptId,
                message: skipped
                  ? 'Omitida: el regalo ya existe en el catálogo.'
                  : 'Regalo creado.',
              },
            })
          },
          { timeout: 15000 }
        )
      } catch (error) {
        if (
          !(
            error instanceof RowValidationError ||
            error instanceof GiftlistSelectionError ||
            error instanceof CategoryNotFoundError
          )
        )
          throw error
        await prisma.$transaction(async tx => {
          await fence(tx, jobId, runId, attemptId)
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
      await fence(tx, jobId, runId, attemptId)
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
    if (pending) await dispatchImportJob(jobId, runId)
  } catch (error) {
    await prisma.$transaction(async tx => {
      const changed = await tx.giftImportJob.updateMany({
        where: { id: jobId, runId, lockOwner: attemptId },
        data: { status: 'QUEUED', lockOwner: '', lockExpiresAt: new Date(0) },
      })
      if (changed.count)
        await tx.giftImportHistory.create({
          data: {
            jobId,
            attemptId,
            message:
              'Error temporal al procesar el lote. La cola reintentará hasta tres veces; se conserva el trabajo completado.',
          },
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
      where: {
        id: jobId,
        runId,
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
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
