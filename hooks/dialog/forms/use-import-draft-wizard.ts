'use client'

import type { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { cancelImportPreparation } from '@/lib/admin-import-api'
import type { GiftImportDataset } from '@/schemas/gift-import'
import { IMPORT_REVIEW_PAGE_SIZE } from '@/schemas/import-job'

export async function readImportFile(
  file: File,
  refs: {
    activeWorker: { current: Worker | null }
    workerTimeout: { current: ReturnType<typeof setTimeout> | null }
  }
) {
  const buffer = await file.arrayBuffer()
  return new Promise<GiftImportDataset[]>((resolve, reject) => {
    const worker = new Worker(
      new URL('../../../lib/gift-import.worker.ts', import.meta.url),
      { type: 'module' }
    )
    refs.activeWorker.current = worker
    refs.workerTimeout.current = setTimeout(
      () =>
        reject(
          new Error(
            'El archivo tardó demasiado en abrirse. Probá con un archivo más pequeño.'
          )
        ),
      30_000
    )
    worker.onmessage = (
      event: MessageEvent<{ datasets?: GiftImportDataset[]; error?: string }>
    ) => {
      if (event.data.datasets) resolve(event.data.datasets)
      else reject(new Error(event.data.error || 'No se pudo leer el archivo.'))
    }
    worker.onerror = () =>
      reject(new Error('No se pudo leer el archivo. Verificá que sea válido.'))
    worker.postMessage({ name: file.name, buffer }, [buffer])
  })
}

export function useAbandonedImportDraft(router: ReturnType<typeof useRouter>) {
  const preparedJobId = useRef('')
  const activeWorker = useRef<Worker | null>(null)
  const workerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      activeWorker.current?.terminate()
      if (workerTimeout.current) clearTimeout(workerTimeout.current)
      const abandonedJobId = preparedJobId.current
      preparedJobId.current = ''
      if (abandonedJobId)
        void cancelImportPreparation(abandonedJobId).catch(() => undefined)
    },
    []
  )

  const cancelPreparedJob = () => {
    const abandonedJobId = preparedJobId.current
    preparedJobId.current = ''
    if (abandonedJobId)
      void cancelImportPreparation(abandonedJobId)
        .then(() => router.refresh())
        .catch(() => undefined)
  }

  return { preparedJobId, activeWorker, workerTimeout, cancelPreparedJob }
}

export async function paginateReviewRows<T>(
  request: (
    page: number
  ) => Promise<{ error?: string; previewToken?: string; preview?: T[] }>,
  count: number,
  token: string,
  onPage?: (rows: T[]) => void
) {
  const rows: T[] = []
  for (let page = 0; page * IMPORT_REVIEW_PAGE_SIZE < count; page++) {
    const result = await request(page)
    if (result.error || result.previewToken !== token || !result.preview)
      throw new Error('No se pudo cargar la revisión completa.')
    rows.push(...result.preview)
    onPage?.(result.preview)
  }
  return rows
}

type DraftRequests<PreviewRow> = {
  start: (input: unknown) => Promise<{ error?: string; jobId?: string }>
  upload: (input: unknown) => Promise<{ error?: string }>
  review: (
    jobId: string
  ) => Promise<{ error?: string; previewToken?: string; rowCount?: number }>
  reviewRows: (input: unknown) => Promise<{
    error?: string
    previewToken?: string
    preview?: PreviewRow[]
  }>
}

// The gift and collection wizards run the same draft protocol against
// different adapters on the server, so it lives here rather than in both.
export async function submitImportDraft<PreviewRow>({
  requests,
  refs,
  content,
  startInput,
  chunks,
  onReviewReady,
  onPage,
}: {
  requests: DraftRequests<PreviewRow>
  refs: {
    preparedJobId: { current: string }
    submissionId: { current: string }
    submissionContent: { current: string }
  }
  content: string
  startInput: Record<string, unknown>
  chunks: unknown[][]
  onReviewReady: (rowCount: number, previewToken: string) => void
  onPage: (rows: PreviewRow[]) => void
}) {
  if (content !== refs.submissionContent.current) {
    if (refs.preparedJobId.current) {
      const cancelled = await cancelImportPreparation(
        refs.preparedJobId.current
      )
      if ('error' in cancelled) throw new Error(cancelled.error)
      refs.preparedJobId.current = ''
    }
    refs.submissionId.current = ''
    refs.submissionContent.current = content
  }
  if (!refs.submissionId.current)
    refs.submissionId.current = crypto.randomUUID()
  const started = await requests.start({
    submissionId: refs.submissionId.current,
    ...startInput,
  })
  if (started.error || !started.jobId)
    throw new Error(started.error || 'No se pudo preparar la importación.')
  refs.preparedJobId.current = started.jobId
  const jobId = started.jobId
  let offset = 0
  for (const chunk of chunks) {
    const uploaded = await requests.upload({ jobId, offset, rows: chunk })
    if (uploaded.error) throw new Error(uploaded.error)
    offset += chunk.length
  }
  const reviewed = await requests.review(jobId)
  if (
    reviewed.error ||
    !reviewed.previewToken ||
    reviewed.rowCount === undefined
  )
    throw new Error(reviewed.error || 'No se pudo revisar la importación.')
  const previewToken = reviewed.previewToken
  // Showing the review step before the rows land is the whole point of paging;
  // the caller opens step 3 here and fills it from onPage.
  onReviewReady(reviewed.rowCount, previewToken)
  const preview = await paginateReviewRows<PreviewRow>(
    page => requests.reviewRows({ jobId, page }),
    reviewed.rowCount,
    previewToken,
    onPage
  )
  return { jobId, previewToken, preview }
}
