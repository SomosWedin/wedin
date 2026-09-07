import type { CollectionImportPreviewRow } from '@/schemas/collection-import'
import { CollectionImportRowSchema } from '@/schemas/collection-import'
import {
  GiftlistGiftSelectionError,
  validateCatalogGiftIds,
} from './giftlist-operations'
import { type RowProcessor, runImportJob } from './import-worker'

class CollectionRowValidationError extends Error {}

const sameIds = (left: string[], right: string[]) => {
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((id, index) => id === sortedRight[index])
  )
}

const collectionRowProcessor: RowProcessor = {
  kind: 'COLLECTION',
  startMessage: 'Procesamiento de colecciones iniciado.',
  temporaryErrorMessage:
    'Error temporal al procesar el lote. La cola reintentará y conservará las colecciones completadas.',
  isRowValidationError: (error): error is Error =>
    error instanceof CollectionRowValidationError ||
    error instanceof GiftlistGiftSelectionError,
  processRow: async (tx, row) => {
    CollectionImportRowSchema.parse(row.input)
    const accepted = row.review as unknown as CollectionImportPreviewRow | null
    if (!accepted?.values || accepted.errors.length)
      throw new CollectionRowValidationError(
        'La fila no tiene una revisión válida guardada.'
      )
    const values = accepted.values
    const targetGiftIds = await validateCatalogGiftIds(tx, values.targetGiftIds)
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
        collection.normalizedName !== values.name.toLocaleLowerCase('es-PY') ||
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
        where: { normalizedName: values.name.toLocaleLowerCase('es-PY') },
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
            gifts: { connect: targetGiftIds.map(id => ({ id })) },
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
    return {
      status,
      collectionId,
      historyMessage:
        status === 'CREATED'
          ? `Colección creada: ${accepted.added.length} regalos agregados, ${accepted.ignored.length} referencias ignoradas.`
          : status === 'UPDATED'
            ? `Colección actualizada: ${accepted.added.length} agregados, ${accepted.removed.length} removidos, ${accepted.ignored.length} referencias ignoradas.`
            : 'Omitida: la colección ya tenía exactamente estos regalos.',
    }
  },
}

export async function processCollectionImportJob(
  jobId: string,
  runId: string,
  deliveryAttempt = 0
) {
  return runImportJob(collectionRowProcessor, jobId, runId, deliveryAttempt)
}
