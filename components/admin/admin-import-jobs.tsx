'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAdminImportJobDetails,
  getAdminImportJobs,
  retryAdminImportJob,
} from '@/actions/data/import-job'
import ExistingImportGiftDialog from '@/components/dialog/existing-import-gift-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { jobStatusLabels, rowStatusLabels } from '@/schemas/import-job'

type Jobs = Awaited<ReturnType<typeof getAdminImportJobs>>
type Details = Awaited<ReturnType<typeof getAdminImportJobDetails>>
const date = (value: Date | string | null) =>
  value ? new Date(value).toLocaleString('es-PY') : '—'

function Pager({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (page: number) => void
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Button
        variant="outline"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {page + 1} de {Math.max(1, Math.ceil(total / 20))}
      </span>
      <Button
        variant="outline"
        disabled={(page + 1) * 20 >= total}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </Button>
    </div>
  )
}

export default function AdminImportJobs() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<Jobs | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [details, setDetails] = useState<Details | null>(null)
  const [rowPage, setRowPage] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const [version, setVersion] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState('')
  const [giftId, setGiftId] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const giftTrigger = useRef<HTMLButtonElement | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: Manual retries must immediately reload persisted status.
  useEffect(() => {
    let cancelled = false
    let running = false
    const refresh = async () => {
      if (running) return
      running = true
      const response = await getAdminImportJobs({
        page,
        search,
        ...(status ? { status } : {}),
      }).catch(
        () => ({ error: 'No se pudieron cargar los trabajos.' }) as const
      )
      if (!cancelled) setResult(response)
      running = false
    }
    void refresh()
    const interval = setInterval(() => void refresh(), 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [page, search, status, version])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Manual retries must immediately reload persisted status.
  useEffect(() => {
    setDetails(null)
    if (!selected) return
    let cancelled = false
    let running = false
    const refresh = async () => {
      if (running) return
      running = true
      const response = await getAdminImportJobDetails({
        jobId: selected,
        page: rowPage,
        historyPage,
      }).catch(
        () => ({ error: 'No se pudieron cargar los detalles.' }) as const
      )
      if (!cancelled) setDetails(response)
      running = false
    }
    void refresh()
    const interval = setInterval(() => void refresh(), 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [selected, rowPage, historyPage, version])

  const retry = useCallback(async () => {
    if (!selected || retrying) return
    setRetrying(true)
    setError('')
    try {
      const response = await retryAdminImportJob(selected)
      if (response.error) setError(response.error)
      setVersion(value => value + 1)
    } catch {
      setError('No se pudo reintentar. Intentá nuevamente.')
    } finally {
      setRetrying(false)
    }
  }, [selected, retrying])
  const job = details && 'job' in details ? details.job : null
  const canRetry =
    job?.acceptedAt &&
    job.status !== 'COMPLETED' &&
    new Date(job.lockExpiresAt) <= new Date()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Buscar por archivo"
          placeholder="Buscar por archivo"
          className="max-w-sm"
          value={search}
          onChange={event => {
            setSearch(event.target.value)
            setPage(0)
          }}
        />
        <select
          aria-label="Estado de la importación"
          className="rounded-md border p-2"
          value={status}
          onChange={event => {
            setStatus(event.target.value)
            setPage(0)
          }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(jobStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {!result ? (
        <p role="status">Cargando trabajos…</p>
      ) : result.error ? (
        <p role="alert">{result.error}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Trabajos de importación de regalos
              </caption>
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Archivo',
                    'Enviado por',
                    'Estado',
                    'Procesadas / total',
                    'Creados / omitidos / fallidos',
                    'Fechas',
                    'Acciones',
                  ].map(label => (
                    <th scope="col" key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.jobs.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="max-w-64 break-words p-3">
                      {item.filename}
                    </td>
                    <td className="p-3">{item.submittedBy}</td>
                    <td className="p-3">{jobStatusLabels[item.status]}</td>
                    <td className="p-3">
                      {item.createdCount + item.skippedCount + item.failedCount}{' '}
                      / {item.expectedRows}
                      {item.status === 'PREPARING' && (
                        <span className="block text-xs">
                          {item.uploadedRows} guardadas
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {item.createdCount} / {item.skippedCount} /{' '}
                      {item.failedCount}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      Creada: {date(item.createdAt)}
                      <br />
                      Actualizada: {date(item.updatedAt)}
                      <br />
                      Finalizada: {date(item.completedAt)}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        onClick={event => {
                          trigger.current = event.currentTarget
                          setRowPage(0)
                          setHistoryPage(0)
                          setError('')
                          setSelected(item.id)
                        }}
                      >
                        Ver detalles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.jobs.length === 0 && (
              <p className="p-6 text-center">
                No hay trabajos con estos filtros.
              </p>
            )}
          </div>
          <Pager page={page} total={result.total} onChange={setPage} />
        </>
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent
          className="max-h-[90dvh] max-w-5xl overflow-y-auto"
          onCloseAutoFocus={event => {
            event.preventDefault()
            trigger.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {job?.filename || 'Detalles de importación'}
            </DialogTitle>
            <DialogDescription>
              Resultados guardados e historial de procesamiento.
            </DialogDescription>
          </DialogHeader>
          {!details ? (
            <p role="status">Cargando detalles…</p>
          ) : details.error ? (
            <p role="alert">{details.error}</p>
          ) : (
            <>
              <p>
                {jobStatusLabels[details.job.status]} ·{' '}
                {details.job.submittedBy}
              </p>
              <p className="text-sm">
                Inicio: {date(details.job.startedAt)} · Finalización:{' '}
                {date(details.job.completedAt)}
              </p>
              {details.job.status === 'PREPARING' && (
                <p className="text-sm">
                  La importación todavía no fue aceptada. Completá la revisión
                  en la ventana de importación.
                </p>
              )}
              <Button
                variant="outline"
                disabled={!canRetry || retrying}
                onClick={() => void retry()}
              >
                {retrying ? 'Enviando…' : 'Reintentar pendientes y fallidos'}
              </Button>
              {error && (
                <p role="alert" className="text-red-700">
                  {error}
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Resultados por fila</caption>
                  <thead>
                    <tr>
                      {['Fila', 'Regalo', 'Estado', 'Resultado'].map(label => (
                        <th className="p-2" scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {details.rows.map(row => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2">{row.rowNumber}</td>
                        <td className="p-2">
                          {String(
                            (row.input as { name?: string })?.name || '—'
                          )}
                        </td>
                        <td className="p-2">{rowStatusLabels[row.status]}</td>
                        <td className="p-2">
                          {row.error}
                          {row.giftId && (
                            <button
                              type="button"
                              className="underline"
                              onClick={event => {
                                giftTrigger.current = event.currentTarget
                                setGiftId(row.giftId)
                              }}
                            >
                              {row.status === 'CREATED'
                                ? 'Ver regalo creado'
                                : 'Ver regalo existente'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={rowPage}
                total={details.job.uploadedRows}
                onChange={setRowPage}
              />
              <h2 className="font-semibold">Historial</h2>
              <ul className="space-y-2 text-sm">
                {details.history.map(entry => (
                  <li key={entry.id}>
                    <time>{date(entry.createdAt)}</time> ·{' '}
                    {entry.rowNumber ? `Fila ${entry.rowNumber}: ` : ''}
                    {entry.message}
                  </li>
                ))}
              </ul>
              <Pager
                page={historyPage}
                total={details.historyTotal}
                onChange={setHistoryPage}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
      <ExistingImportGiftDialog
        giftId={giftId}
        onClose={() => setGiftId(null)}
        restoreFocus={() => giftTrigger.current?.focus()}
      />
    </div>
  )
}
