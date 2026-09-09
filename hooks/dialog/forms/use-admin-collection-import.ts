'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
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
import {
  paginateReviewRows,
  readImportFile,
  submitImportDraft,
  useAbandonedImportDraft,
} from './use-import-draft-wizard'

export function useAdminCollectionImport() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState<
    'file' | 'preview' | 'rows' | 'import' | null
  >(null)
  const [error, setError] = useState('')
  const [queueDispatchFailed, setQueueDispatchFailed] = useState(false)
  const [fileName, setFileName] = useState('')
  const [datasets, setDatasets] = useState<GiftImportDataset[]>([])
  const [datasetIndex, setDatasetIndex] = useState(0)
  const [mapping, setMapping] = useState<CollectionImportMapping>(() =>
    autoMatchCollectionImportHeaders([])
  )
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<CollectionImportPreviewRow[]>([])
  const [reviewTotal, setReviewTotal] = useState(0)
  const [previewToken, setPreviewToken] = useState('')
  const [skipErrors, setSkipErrors] = useState(false)
  const [acknowledgeRemovals, setAcknowledgeRemovals] = useState(false)
  const [acknowledgeIgnored, setAcknowledgeIgnored] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const submissionId = useRef('')
  const submissionContent = useRef('')
  const { preparedJobId, activeWorker, workerTimeout, cancelPreparedJob } =
    useAbandonedImportDraft(router)
  const busy = useRef(false)
  const dataset = datasets[datasetIndex]

  const reset = () => {
    setStep(0)
    setLoading(null)
    setError('')
    setQueueDispatchFailed(false)
    setFileName('')
    setDatasets([])
    setDatasetIndex(0)
    setMapping(autoMatchCollectionImportHeaders([]))
    setMatches({})
    setPreview([])
    setReviewTotal(0)
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
    setQueueDispatchFailed(false)
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES)
        throw new Error('El archivo supera 10 MB.')
      const parsed = await readImportFile(file, { activeWorker, workerTimeout })
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

  const loadReview = (id: string, count: number, token: string) =>
    paginateReviewRows<CollectionImportPreviewRow>(
      page => requestCollectionImport('reviewRows', { jobId: id, page }),
      count,
      token
    )

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
    setQueueDispatchFailed(false)
    try {
      const { previewToken: token, preview: rows } =
        await submitImportDraft<CollectionImportPreviewRow>({
          requests: {
            start: input => requestCollectionImport('start', input),
            upload: input => requestCollectionImport('upload', input),
            review: id => requestCollectionImport('review', id),
            reviewRows: input => requestCollectionImport('reviewRows', input),
          },
          refs: { preparedJobId, submissionId, submissionContent },
          content: JSON.stringify(parsed.data),
          startInput: {
            filename: fileName,
            expectedRows: parsed.data.length,
          },
          chunks: chunkCollectionImportRows(parsed.data),
          onReviewReady: (rowCount, previewTokenValue) => {
            setPreviewToken(previewTokenValue)
            setPreview([])
            setReviewTotal(rowCount)
            setSkipErrors(false)
            setAcknowledgeRemovals(false)
            setAcknowledgeIgnored(false)
            setLoading('rows')
            setStep(2)
          },
          onPage: page => setPreview(current => [...current, ...page]),
        })
      setPreviewToken(token)
      setPreview(rows)
    } catch (failure) {
      setPreview([])
      setReviewTotal(0)
      setStep(1)
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
    setQueueDispatchFailed(false)
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
        setQueueDispatchFailed(
          'queueDispatchFailed' in result && result.queueDispatchFailed === true
        )
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
      if ('jobId' in result && result.jobId) {
        preparedJobId.current = ''
        setJobId(result.jobId)
        router.refresh()
      }
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
    queueDispatchFailed,
    fileName,
    datasets,
    dataset,
    datasetIndex,
    mapping,
    matches,
    preview,
    reviewTotal,
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
        setPreview([])
        setReviewTotal(0)
        setStep(value => Math.max(0, value - 1))
        setQueueDispatchFailed(false)
      }
    },
    review,
    accept,
  }
}

export type AdminCollectionImportController = ReturnType<
  typeof useAdminCollectionImport
>
