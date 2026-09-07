'use server'

import type { CollectionImportPreviewRow } from '@/schemas/collection-import'
import { CollectionImportRowsSchema } from '@/schemas/collection-import'
import {
  AcceptCollectionImportJobSchema,
  StartCollectionImportJobSchema,
  UploadCollectionImportRowsSchema,
} from '@/schemas/import-job'
import { previewCollectionRows } from './collection-import-preview'
import { reviewResult, saveImportReview } from './gift-import-preview'
import {
  acceptImportDraft,
  getImportReviewRows,
  type ImportDraftAdapter,
  reviewImportDraft,
  startImportDraft,
  uploadImportRows,
} from './import-draft'

const collectionDraftAdapter: ImportDraftAdapter = {
  kind: 'COLLECTION',
  startSchema: StartCollectionImportJobSchema,
  uploadSchema: UploadCollectionImportRowsSchema,
  acceptSchema: AcceptCollectionImportJobSchema,
  resolveCreateMissingCollections: () => false,
  buildReview: async (tx, savedRowInputs) => {
    const rows = CollectionImportRowsSchema.parse(savedRowInputs)
    return reviewResult(await previewCollectionRows(tx, rows))
  },
  saveReview: (tx, jobId, preview) => saveImportReview(tx, jobId, preview),
  extraAcceptGuard: (includedRows, input) => {
    const rows = includedRows as unknown as CollectionImportPreviewRow[]
    const { acknowledgeRemovals, acknowledgeIgnored } = input as {
      acknowledgeRemovals?: boolean
      acknowledgeIgnored?: boolean
    }
    if (rows.some(row => row.removed.length) && !acknowledgeRemovals)
      return 'Confirmá los regalos que se quitarán.'
    if (rows.some(row => row.ignored.length) && !acknowledgeIgnored)
      return 'Confirmá las referencias que se ignorarán.'
    return null
  },
  messages: {
    uploadFailed: 'No se pudo guardar el bloque.',
    reviewChanged:
      'El catálogo cambió desde la revisión. Revisá los cambios actualizados.',
    reviewHasErrors:
      'La revisión tiene errores. Dejá al menos una colección válida.',
    acceptHistory: 'Importación de colecciones aceptada y guardada.',
    acceptFailed:
      'No se pudo poner la importación en cola. Revisá su estado en Trabajos.',
  },
}

export async function startAdminCollectionImportJob(input: unknown) {
  return startImportDraft(collectionDraftAdapter, input)
}

export async function uploadAdminCollectionImportRows(input: unknown) {
  return uploadImportRows(collectionDraftAdapter, input)
}

export async function reviewAdminCollectionImportJob(input: unknown) {
  return reviewImportDraft(collectionDraftAdapter, input)
}

export async function getAdminCollectionImportReviewRows(input: unknown) {
  return getImportReviewRows<CollectionImportPreviewRow>(
    collectionDraftAdapter,
    input
  )
}

export async function acceptAdminCollectionImport(input: unknown) {
  return acceptImportDraft(collectionDraftAdapter, input)
}
