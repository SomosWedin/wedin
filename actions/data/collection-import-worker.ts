import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { dispatchImportJob } from '@/lib/server/import-queue'
import prisma from '@/prisma/client'
import type { CollectionImportPreviewRow } from '@/schemas/collection-import'
import { CollectionImportRowSchema } from '@/schemas/collection-import'
import {
  GiftlistGiftSelectionError,
  validateCatalogGiftIds,
} from './giftlist-operations'
import { IMPORT_LEASE_MS, ImportBusyError } from './import-job-worker'

class CollectionRowValidationError extends Error {}

const sameIds = (left: string[], right: string[]) => {
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((id, index) => id === sortedRight[index])
  )
}

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

export async function processCollectionImportJob(
  jobId: string,
  runId: string,
  deliveryAttempt = 0
) {
  const attemptId = randomUUID()
  const started = Date.now()
  const acquired = await prisma.giftImportJob.updateMany({
    where: {
      id: jobId,
      kind: 'COLLECTION',
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
          : 'Procesamiento de colecciones iniciado.',
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
            CollectionImportRowSchema.parse(row.input)
            const accepted =
              row.review as unknown as CollectionImportPreviewRow | null
            if (!accepted?.values || accepted.errors.length)
              throw new CollectionRowValidationError(
                'La fila no tiene una revisión válida guardada.'
              )
            const values = accepted.values
            const targetGiftIds = await validateCatalogGiftIds(
              tx,
              values.targetGiftIds
            )
            let collectionId = values.collectionId
            if (collectionId) {
              const collection = await tx.giftlist.findUnique({
                where: { id: collectionId },
                select: { id: true, normalizedName: true, giftIds: true },
              })
              if (!collection)
                throw new CollectionRowValidationError(
                  'La colección revisada ya no existe.'
                )
              if (
                collection.normalizedName !==
                  values.name.toLocaleLowerCase('es-PY') ||
                !sameIds(collection.giftIds, values.expectedGiftIds)
              )
                throw new CollectionRowValidationError(
                  'La colección cambió después de la revisión. Creá una nueva importación para revisar el estado actual.'
                )
              await tx.giftlist.update({
                where: { id: collection.id },
                data: { gifts: { set: targetGiftIds.map(id => ({ id })) } },
              })
            } else {
              if (!targetGiftIds.length)
                throw new CollectionRowValidationError(
                  'No se puede crear una colección vacía.'
                )
              const duplicate = await tx.giftlist.findUnique({
                where: {
                  normalizedName: values.name.toLocaleLowerCase('es-PY'),
                },
                select: { id: true },
              })
              if (duplicate)
                throw new CollectionRowValidationError(
                  'La colección fue creada después de la revisión.'
                )
              collectionId = (
                await tx.giftlist.create({
                  data: {
                    name: values.name,
                    normalizedName: values.name.toLocaleLowerCase('es-PY'),
                    gifts: {
                      connect: targetGiftIds.map(id => ({ id })),
                    },
                  },
                })
              ).id
            }
            const status =
              accepted.action === 'create'
                ? 'CREATED'
                : accepted.action === 'update'
                  ? 'UPDATED'
                  : 'SKIPPED'
            await tx.giftImportRow.update({
              where: { id: row.id },
              data: {
                status,
                collectionId,
                error: null,
                attempts: { increment: 1 },
              },
            })
            await tx.giftImportJob.update({
              where: { id: jobId },
              data:
                status === 'CREATED'
                  ? { createdCount: { increment: 1 } }
                  : status === 'UPDATED'
                    ? { updatedCount: { increment: 1 } }
                    : { skippedCount: { increment: 1 } },
            })
            await tx.giftImportHistory.create({
              data: {
                jobId,
                rowNumber: row.rowNumber,
                attemptId,
                message:
                  status === 'CREATED'
                    ? `Colección creada: ${accepted.added.length} regalos agregados, ${accepted.ignored.length} referencias ignoradas.`
                    : status === 'UPDATED'
                      ? `Colección actualizada: ${accepted.added.length} agregados, ${accepted.removed.length} removidos, ${accepted.ignored.length} referencias ignoradas.`
                      : 'Omitida: la colección ya tenía exactamente estos regalos.',
              },
            })
          },
          { timeout: 15000 }
        )
      } catch (error) {
        if (
          !(
            error instanceof CollectionRowValidationError ||
            error instanceof GiftlistGiftSelectionError
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
    if (pending) await dispatchImportJob(jobId, runId, 'COLLECTION')
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
              'Error temporal al procesar el lote. La cola reintentará y conservará las colecciones completadas.',
          },
        })
    })
    throw error
  }
}
