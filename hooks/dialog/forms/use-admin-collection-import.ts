'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  cancelImportPreparation,
  requestCollectionImport,
} from '@/lib/admin-import-api'
import {
  autoMatchCollectionImportHeaders,
  chunkCollectionImportRows,
  mapCollectionImportRows,
} from '@/lib/collection-import'
import type {
  CollectionImportField,
  CollectionImportMapping,
  CollectionImportPreviewRow,
} from '@/schemas/collection-import'
import { CollectionImportRowsSchema } from '@/schemas/collection-import'
import type { GiftImportDataset } from '@/schemas/gift-import'
import { MAX_IMPORT_FILE_BYTES } from '@/schemas/gift-import'

export function useAdminCollectionImport() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState<'file' | 'preview' | 'import' | null>(
    null
  )
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [datasets, setDatasets] = useState<GiftImportDataset[]>([])
  const [datasetIndex, setDatasetIndex] = useState(0)
  const [mapping, setMapping] = useState<CollectionImportMapping>(() =>
    autoMatchCollectionImportHeaders([])
  )
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<CollectionImportPreviewRow[]>([])
  const [previewToken, setPreviewToken] = useState('')
  const [skipErrors, setSkipErrors] = useState(false)
  const [acknowledgeRemovals, setAcknowledgeRemovals] = useState(false)
  const [acknowledgeIgnored, setAcknowledgeIgnored] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const submissionId = useRef('')
  const submissionContent = useRef('')
  const preparedJobId = useRef('')
  const activeWorker = useRef<Worker | null>(null)
  const workerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busy = useRef(false)
  const dataset = datasets[datasetIndex]

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
    if (abandonedJobId) {
      void cancelImportPreparation(abandonedJobId)
        .then(() => router.refresh())
        .catch(() => undefined)
    }
  }

  const reset = () => {
    setStep(0)
    setLoading(null)
    setError('')
    setFileName('')
    setDatasets([])
    setDatasetIndex(0)
    setMapping(autoMatchCollectionImportHeaders([]))
    setMatches({})
    setPreview([])
    setPreviewToken('')
    setSkipErrors(false)
    setAcknowledgeRemovals(false)
    setAcknowledgeIgnored(false)
    setJobId(null)
    submissionId.current = ''
    submissionContent.current = ''
    preparedJobId.current = ''
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (busy.current) return
    setOpen(nextOpen)
    if (!nextOpen) {
      cancelPreparedJob()
      reset()
    }
  }

  const upload = async (file: File) => {
    if (busy.current) return
    busy.current = true
    setLoading('file')
    setError('')
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES)
        throw new Error('El archivo supera 10 MB.')
      const buffer = await file.arrayBuffer()
      const parsed = await new Promise<GiftImportDataset[]>(
        (resolve, reject) => {
          const worker = new Worker(
            new URL('../../../lib/gift-import.worker.ts', import.meta.url),
            { type: 'module' }
          )
          activeWorker.current = worker
          workerTimeout.current = setTimeout(
            () =>
              reject(
                new Error(
                  'El archivo tardó demasiado en abrirse. Probá con un archivo más pequeño.'
                )
              ),
            30_000
          )
          worker.onmessage = event =>
            event.data.datasets
              ? resolve(event.data.datasets)
              : reject(
                  new Error(event.data.error || 'No se pudo leer el archivo.')
                )
          worker.onerror = () =>
            reject(new Error('No se pudo leer el archivo.'))
          worker.postMessage({ name: file.name, buffer }, [buffer])
        }
      )
      setDatasets(parsed)
      setDatasetIndex(0)
      setFileName(file.name)
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No se pudo leer el archivo.'
      )
    } finally {
      activeWorker.current?.terminate()
      activeWorker.current = null
      if (workerTimeout.current) clearTimeout(workerTimeout.current)
      workerTimeout.current = null
      busy.current = false
      setLoading(null)
    }
  }

  const updateMapping = (
    field: CollectionImportField,
    value: CollectionImportMapping[CollectionImportField]
  ) => {
    setMapping(current => ({ ...current, [field]: value }))
    setMatches({})
    setError('')
  }

  const loadReview = async (id: string, count: number, token: string) => {
    const rows: CollectionImportPreviewRow[] = []
    for (let page = 0; page * 10 < count; page++) {
      const result = await requestCollectionImport('reviewRows', {
        jobId: id,
        page,
        historyPage: 0,
      })
      if (result.error || result.previewToken !== token)
        throw new Error('No se pudo cargar la revisión completa.')
      rows.push(...result.preview)
    }
    return rows
  }

  const review = async () => {
    if (!dataset || busy.current) return
    const parsed = CollectionImportRowsSchema.safeParse(
      mapCollectionImportRows(dataset, mapping, matches)
    )
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Revisá los datos.')
      return
    }
    busy.current = true
    setLoading('preview')
    setError('')
    try {
      const content = JSON.stringify(parsed.data)
      if (content !== submissionContent.current) {
        if (preparedJobId.current) {
          const cancelled = await cancelImportPreparation(preparedJobId.current)
          if ('error' in cancelled) throw new Error(cancelled.error)
          preparedJobId.current = ''
        }
        submissionId.current = ''
        submissionContent.current = content
      }
      if (!submissionId.current) submissionId.current = crypto.randomUUID()
      const started = await requestCollectionImport('start', {
        submissionId: submissionId.current,
        filename: fileName,
        expectedRows: parsed.data.length,
      })
      if (started.error) throw new Error(started.error)
      preparedJobId.current = started.jobId
      let offset = 0
      for (const chunk of chunkCollectionImportRows(parsed.data)) {
        const uploaded = await requestCollectionImport('upload', {
          jobId: started.jobId,
          offset,
          rows: chunk,
        })
        if (uploaded.error) throw new Error(uploaded.error)
        offset += chunk.length
      }
      const result = await requestCollectionImport('review', started.jobId)
      if (result.error) throw new Error(result.error)
      const reviewed = await loadReview(
        started.jobId,
        result.rowCount,
        result.previewToken
      )
      setPreview(reviewed)
      setPreviewToken(result.previewToken)
      setSkipErrors(false)
      setAcknowledgeRemovals(false)
      setAcknowledgeIgnored(false)
      setStep(2)
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No se pudo obtener la revisión.'
      )
    } finally {
      busy.current = false
      setLoading(null)
    }
  }

  const accept = async () => {
    if (busy.current || jobId) return
    const invalid = preview.filter(row => row.errors.length || !row.values)
    busy.current = true
    setLoading('import')
    setError('')
    try {
      const result = await requestCollectionImport('accept', {
        jobId: preparedJobId.current,
        previewToken,
        excludedRowNumbers: skipErrors ? invalid.map(row => row.rowNumber) : [],
        acknowledgeRemovals,
        acknowledgeIgnored,
      })
      if (result.error) {
        setError(result.error)
        if (
          'reviewChanged' in result &&
          result.reviewChanged &&
          result.previewToken
        ) {
          setPreview(
            await loadReview(
              preparedJobId.current,
              preview.length,
              result.previewToken
            )
          )
          setPreviewToken(result.previewToken)
          setAcknowledgeRemovals(false)
          setAcknowledgeIgnored(false)
        }
        return
      }
      preparedJobId.current = ''
      setJobId(result.jobId)
      router.refresh()
    } catch {
      setError('No se pudo poner la importación en cola.')
    } finally {
      busy.current = false
      setLoading(null)
    }
  }

  return {
    open,
    step,
    loading,
    error,
    fileName,
    datasets,
    dataset,
    datasetIndex,
    mapping,
    matches,
    preview,
    skipErrors,
    acknowledgeRemovals,
    acknowledgeIgnored,
    jobId,
    upload,
    setDatasetIndex,
    updateMapping,
    setMatches,
    setSkipErrors,
    setAcknowledgeRemovals,
    setAcknowledgeIgnored,
    handleOpenChange,
    next: () => {
      if (!dataset) return
      setMapping(autoMatchCollectionImportHeaders(dataset.headers))
      setMatches({})
      setStep(1)
      setError('')
    },
    back: () => {
      if (!busy.current) {
        cancelPreparedJob()
        submissionId.current = ''
        submissionContent.current = ''
        setStep(value => Math.max(0, value - 1))
      }
    },
    review,
    accept,
  }
}

export type AdminCollectionImportController = ReturnType<
  typeof useAdminCollectionImport
>
