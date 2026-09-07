'use client'

import type { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { cancelImportPreparation } from '@/lib/admin-import-api'
import type { GiftImportDataset } from '@/schemas/gift-import'

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
  token: string
) {
  const rows: T[] = []
  for (let page = 0; page * 10 < count; page++) {
    const result = await request(page)
    if (result.error || result.previewToken !== token || !result.preview)
      throw new Error('No se pudo cargar la revisión completa.')
    rows.push(...result.preview)
  }
  return rows
}
