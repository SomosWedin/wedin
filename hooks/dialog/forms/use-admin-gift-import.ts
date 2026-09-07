'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  cancelImportPreparation,
  requestGiftImport,
} from '@/lib/admin-import-api'
import {
  autoMatchGiftImportHeaders,
  chunkGiftImportRows,
  mapGiftImportRows,
} from '@/lib/gift-import'
import {
  type GiftImportDataset,
  type GiftImportField,
  type GiftImportMapping,
  type GiftImportPreviewRow,
  type GiftImportRelation,
  GiftImportRowsSchema,
  type GiftImportValueMatches,
  MAX_IMPORT_FILE_BYTES,
} from '@/schemas/gift-import'

const emptyMatches = (): GiftImportValueMatches => ({
  category: {},
  collections: {},
  eventTypes: {},
})

export function useAdminGiftImport() {
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
  const [mapping, setMapping] = useState<GiftImportMapping>(() =>
    autoMatchGiftImportHeaders([])
  )
  const [matches, setMatches] = useState(emptyMatches)
  const submissionId = useRef('')
  const submissionContent = useRef('')
  const preparedJobId = useRef('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [previewToken, setPreviewToken] = useState('')
  const [preview, setPreview] = useState<GiftImportPreviewRow[]>([])
  const [skipErrors, setSkipErrors] = useState(false)
  const [createMissingCollections, setCreateMissingCollections] =
    useState(false)
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (busy.current) return
    setOpen(nextOpen)
    if (!nextOpen) {
      cancelPreparedJob()
      setStep(0)
      setError('')
      setFileName('')
      setDatasets([])
      setDatasetIndex(0)
      setMapping(autoMatchGiftImportHeaders([]))
      setMatches(emptyMatches())
      submissionId.current = ''
      submissionContent.current = ''
      setPreviewToken('')
      setPreview([])
      setSkipErrors(false)
      setCreateMissingCollections(false)
      setJobId(null)
    }
  }

  const upload = async (file: File) => {
    if (busy.current) return
    busy.current = true
    setLoading('file')
    setError('')
    setDatasets([])
    setFileName('')
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
          worker.onmessage = (
            event: MessageEvent<{
              datasets?: GiftImportDataset[]
              error?: string
            }>
          ) => {
            if (event.data.datasets) resolve(event.data.datasets)
            else
              reject(
                new Error(event.data.error || 'No se pudo leer el archivo.')
              )
          }
          worker.onerror = () =>
            reject(
              new Error('No se pudo leer el archivo. Verificá que sea válido.')
            )
          worker.postMessage({ name: file.name, buffer }, [buffer])
        }
      )
      setDatasets(parsed)
      setFileName(file.name)
      setDatasetIndex(0)
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
      busy.current = false
      setLoading(null)
    }
  }

  const next = () => {
    if (!dataset) return
    setMapping(autoMatchGiftImportHeaders(dataset.headers))
    setMatches(emptyMatches())
    setCreateMissingCollections(false)
    setError('')
    setStep(1)
  }

  const updateMapping = (
    field: GiftImportField,
    value: GiftImportMapping[GiftImportField]
  ) => {
    setMapping(current => ({ ...current, [field]: value }))
    if (
      field === 'category' ||
      field === 'collections' ||
      field === 'eventTypes'
    ) {
      setMatches(current => ({ ...current, [field]: {} }))
    }
    setError('')
  }
  const matchValue = (
    field: GiftImportRelation,
    source: string,
    target: string
  ) => {
    setMatches(current => ({
      ...current,
      [field]: { ...current[field], [source]: target },
    }))
  }

  const loadReview = async (id: string, count: number, token: string) => {
    const reviewed: GiftImportPreviewRow[] = []
    for (let page = 0; page * 10 < count; page++) {
      const result = await requestGiftImport('reviewRows', { jobId: id, page })
      if (result.error || result.previewToken !== token)
        throw new Error('No se pudo cargar la revisión completa.')
      reviewed.push(...result.preview)
    }
    return reviewed
  }

  const review = async () => {
    if (!dataset || busy.current) return
    const parsed = GiftImportRowsSchema.safeParse(
      mapGiftImportRows(dataset, mapping, matches)
    )
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá los datos.')
      return
    }
    busy.current = true
    setLoading('preview')
    setError('')
    try {
      const content = JSON.stringify({
        rows: parsed.data,
        createMissingCollections,
      })
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
      const started = await requestGiftImport('start', {
        submissionId: submissionId.current,
        filename: fileName,
        expectedRows: parsed.data.length,
        createMissingCollections,
      })
      if (started.error) {
        setError(started.error)
        return
      }
      preparedJobId.current = started.jobId
      let offset = 0
      for (const chunk of chunkGiftImportRows(parsed.data)) {
        const uploaded = await requestGiftImport('upload', {
          jobId: started.jobId,
          offset,
          rows: chunk,
        })
        offset += chunk.length
        if (uploaded.error) {
          setError(uploaded.error)
          return
        }
      }
      const result = await requestGiftImport('review', started.jobId)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      if ('previewToken' in result) {
        const reviewed = await loadReview(
          started.jobId,
          result.rowCount,
          result.previewToken
        )
        setPreviewToken(result.previewToken)
        setPreview(reviewed)
        setSkipErrors(false)
        setStep(2)
      }
    } catch {
      setError('No se pudo obtener la revisión. Intentá nuevamente.')
    } finally {
      busy.current = false
      setLoading(null)
    }
  }

  const accept = async () => {
    if (busy.current || jobId !== null) return
    const invalid = preview.filter(row => row.errors.length || !row.values)
    if (invalid.length && !skipErrors) return
    busy.current = true
    setLoading('import')
    setError('')
    try {
      const result = await requestGiftImport('accept', {
        jobId: preparedJobId.current,
        previewToken,
        excludedRowNumbers: skipErrors ? invalid.map(row => row.rowNumber) : [],
      })
      if ('error' in result && result.error) {
        setError(result.error)
        if ('reviewChanged' in result && result.reviewChanged) {
          const refreshed = await loadReview(
            preparedJobId.current,
            preview.length,
            result.previewToken
          )
          setPreviewToken(result.previewToken)
          setPreview(refreshed)
        }
        setSkipErrors(false)
        return
      }
      if ('jobId' in result && result.jobId) {
        preparedJobId.current = ''
        setJobId(result.jobId)
        router.refresh()
      }
    } catch {
      setError(
        'Se perdió la conexión. Podés volver a aceptar: se recuperará el mismo trabajo, sin duplicar regalos.'
      )
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
    datasetIndex,
    dataset,
    mapping,
    matches,
    preview,
    skipErrors,
    createMissingCollections,
    jobId,
    handleOpenChange,
    upload,
    next,
    updateMapping,
    matchValue,
    review,
    accept,
    setDatasetIndex,
    setSkipErrors,
    setCreateMissingCollections,
    back: () => {
      if (!busy.current) {
        cancelPreparedJob()
        submissionId.current = ''
        submissionContent.current = ''
        setStep(current => Math.max(0, current - 1))
        setError('')
        setSkipErrors(false)
      }
    },
  }
}

export type AdminGiftImportController = ReturnType<typeof useAdminGiftImport>
