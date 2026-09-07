import { buildGiftImportPreview } from '@/lib/gift-import'
import { buildGiftNameScopeKey } from '@/lib/gift-name'
import {
  type GiftImportCatalog,
  type GiftImportPreviewRow,
  GiftImportRowSchema,
} from '@/schemas/gift-import'
import { loadImportCatalog, resolveExistingGifts } from './gift-import-preview'
import { CategoryNotFoundError, createGiftRecord } from './gift-operations'
import {
  GiftlistSelectionError,
  validateGiftlistIdsForCreate,
} from './giftlist-operations'
import { type RowProcessor, runImportJob } from './import-worker'

export { IMPORT_LEASE_MS, ImportBusyError } from './import-job-lease'
export { recordImportDeliveryFailure } from './import-worker'

class RowValidationError extends Error {}

type GiftDeliveryContext = {
  catalog: GiftImportCatalog
  existingKeys: Set<string>
  existingByKey: Map<string, string>
}

const giftRowProcessor: RowProcessor<GiftDeliveryContext> = {
  kind: 'GIFT',
  startMessage: 'Procesamiento de lote iniciado.',
  temporaryErrorMessage:
    'Error temporal al procesar el lote. La cola reintentará hasta tres veces; se conserva el trabajo completado.',
  isRowValidationError: (error): error is Error =>
    error instanceof RowValidationError ||
    error instanceof GiftlistSelectionError ||
    error instanceof CategoryNotFoundError,
  prepare: async (client, rows) => {
    const catalog = await loadImportCatalog(client)
    const reviewed = rows.flatMap(row => {
      const review = row.review as unknown as GiftImportPreviewRow | null
      return review?.values ? [review] : []
    })
    const existingByKey = await resolveExistingGifts(client, reviewed)
    return {
      catalog,
      existingKeys: new Set(existingByKey.keys()),
      existingByKey,
    }
  },
  processRow: async (tx, row, job, ctx) => {
    const input = GiftImportRowSchema.parse(row.input)
    const accepted = row.review as unknown as GiftImportPreviewRow | null
    if (!accepted?.values)
      throw new RowValidationError(
        'La fila no tiene una revisión válida guardada.'
      )
    input.category = accepted.values.categoryId
    input.collections = [
      ...accepted.values.giftlistIds,
      ...accepted.values.newGiftlistNames,
    ].join('|')
    const [reviewed] = buildGiftImportPreview(
      [input],
      ctx.catalog,
      ctx.existingKeys,
      job.createMissingCollections
    )
    const existingGiftId = reviewed.values
      ? ctx.existingByKey.get(
          buildGiftNameScopeKey({ ...reviewed.values, isDefault: true })
        )
      : undefined
    let giftId = existingGiftId
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
                      message.includes('tipo') || message.includes('Tipo')
                  )
                ? 'Revisá los tipos de evento: cambiaron los tipos disponibles o admitidos por la categoría.'
                : 'La fila ya no pasa la validación. Revisá el nombre, precio, imagen y las colecciones guardadas.'
        )
      const { giftlistIds, newGiftlistNames, ...values } = reviewed.values
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
    const skipped = Boolean(existingGiftId)
    return {
      status: skipped ? 'SKIPPED' : 'CREATED',
      giftId,
      historyMessage: skipped
        ? 'Omitida: el regalo ya existe en el catálogo.'
        : 'Regalo creado.',
    }
  },
}

export async function processImportJob(
  jobId: string,
  runId: string,
  deliveryAttempt = 0
) {
  return runImportJob(giftRowProcessor, jobId, runId, deliveryAttempt)
}
