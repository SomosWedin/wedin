'use client'

import type {
  acceptAdminCollectionImport,
  getAdminCollectionImportReviewRows,
  reviewAdminCollectionImportJob,
  startAdminCollectionImportJob,
  uploadAdminCollectionImportRows,
} from '@/actions/data/collection-import'
import type {
  acceptAdminGiftImport,
  cancelAdminImportJob,
  getAdminImportReviewRows,
  reviewAdminImportJob,
  startAdminImportJob,
  uploadAdminImportRows,
} from '@/actions/data/import-job'

type GiftResults = {
  start: Awaited<ReturnType<typeof startAdminImportJob>>
  upload: Awaited<ReturnType<typeof uploadAdminImportRows>>
  review: Awaited<ReturnType<typeof reviewAdminImportJob>>
  reviewRows: Awaited<ReturnType<typeof getAdminImportReviewRows>>
  accept: Awaited<ReturnType<typeof acceptAdminGiftImport>>
}

type CollectionResults = {
  start: Awaited<ReturnType<typeof startAdminCollectionImportJob>>
  upload: Awaited<ReturnType<typeof uploadAdminCollectionImportRows>>
  review: Awaited<ReturnType<typeof reviewAdminCollectionImportJob>>
  reviewRows: Awaited<ReturnType<typeof getAdminCollectionImportReviewRows>>
  accept: Awaited<ReturnType<typeof acceptAdminCollectionImport>>
}

async function requestImport<T>(
  kind: 'gift' | 'collection',
  operation: string,
  input: unknown
) {
  const response = await fetch(`/api/admin/import-jobs/draft/${kind}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, input }),
  })
  if (!response.ok) throw new Error(`Import request failed: ${response.status}`)
  return (await response.json()) as T
}

export function requestGiftImport<K extends keyof GiftResults>(
  operation: K,
  input: unknown
) {
  return requestImport<GiftResults[K]>('gift', operation, input)
}

export function requestCollectionImport<K extends keyof CollectionResults>(
  operation: K,
  input: unknown
) {
  return requestImport<CollectionResults[K]>('collection', operation, input)
}

export async function cancelImportPreparation(jobId: string) {
  const response = await fetch(`/api/admin/import-jobs/${jobId}/cancel`, {
    method: 'POST',
    cache: 'no-store',
    keepalive: true,
  })
  if (!response.ok)
    throw new Error(`Import cancellation failed: ${response.status}`)
  return (await response.json()) as Awaited<
    ReturnType<typeof cancelAdminImportJob>
  >
}
