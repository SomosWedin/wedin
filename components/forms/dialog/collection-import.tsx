'use client'

import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useId, useState } from 'react'
import CollectionImportMapping from '@/components/admin/collection-import-mapping'
import CollectionImportPreview from '@/components/admin/collection-import-preview'
import { ImportSelect } from '@/components/admin/gift-import-mapping'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import type { AdminCollectionImportController } from '@/hooks/dialog/forms/use-admin-collection-import'
import type { CollectionImportGift } from '@/schemas/collection-import'

function UploadStep({
  controller,
}: {
  controller: AdminCollectionImportController
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const { dataset, datasets, datasetIndex, fileName, loading } = controller
  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center ${dragging ? 'border-success bg-gray-100' : 'border-gray-200 bg-gray-50'}`}
        onDragOver={event => {
          event.preventDefault()
          if (!loading) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files[0]
          if (!loading && file) void controller.upload(file)
        }}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-textTertiary" />
        <p className="font-medium">Arrastrá tu archivo aquí</p>
        <p className="mt-1 text-sm text-textTertiary">
          CSV, Excel (.xlsx, .xls) o un ZIP que los contenga
        </p>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          aria-label="Archivo de colecciones"
          accept=".csv,.xlsx,.xls,.zip"
          disabled={Boolean(loading)}
          onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void controller.upload(file)
          }}
        />
        <span className="mt-4 inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm font-medium">
          {loading === 'file' ? 'Leyendo archivo…' : 'Seleccionar archivo'}
        </span>
      </label>
      <p className="text-sm text-textTertiary">
        El archivo debe incluir el nombre de cada colección y sus regalos. Los
        regalos se buscan en el catálogo; este proceso no crea ni edita regalos.
      </p>
      {dataset && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-5 w-5" />
            <span className="break-all font-medium">{fileName}</span>
          </div>
          {datasets.length > 1 && (
            <ImportSelect
              label="Archivo u hoja a importar"
              value={String(datasetIndex)}
              onChange={value => controller.setDatasetIndex(Number(value))}
              options={datasets.map((item, index) => ({
                value: String(index),
                label: `${item.name} (${item.rows.length} filas)`,
              }))}
            />
          )}
          <p className="text-sm text-textTertiary">
            {dataset.rows.length} filas · {dataset.headers.length} columnas
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {dataset.headers.map((header, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: File column positions are stable identifiers, including duplicate headers.
                    <th key={`${index}-${header}`} className="min-w-32 p-2">
                      {header || `Columna ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.rows.slice(0, 3).map(row => (
                  <tr key={row.rowNumber} className="border-t">
                    {row.cells.map((cell, index) => (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: File columns never reorder within this preview.
                        key={`${row.rowNumber}-${index}`}
                        className="max-w-64 truncate p-2"
                        title={cell}
                      >
                        {cell || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CollectionImportForm({
  controller,
  gifts,
}: {
  controller: AdminCollectionImportController
  gifts: CollectionImportGift[]
}) {
  const { step, loading, error, preview, jobId } = controller
  const invalid = preview.filter(row => row.errors.length).length
  const valid = preview.length - invalid
  const validRows = preview.filter(row => !row.errors.length)
  const hasRemovals = validRows.some(row => row.removed.length)
  const hasIgnored = validRows.some(row => row.ignored.length)
  const canAccept =
    valid > 0 &&
    (!invalid || controller.skipErrors) &&
    (!hasRemovals || controller.acknowledgeRemovals) &&
    (!hasIgnored || controller.acknowledgeIgnored)
  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      onSubmit={event => {
        event.preventDefault()
        if (loading || jobId) return
        if (step === 0) controller.next()
        else if (step === 1) void controller.review()
        else if (canAccept) void controller.accept()
      }}
    >
      <ol
        className="grid shrink-0 grid-cols-3 gap-2"
        aria-label="Pasos de importación"
      >
        {['Subir archivo', 'Relacionar datos', 'Revisar y aceptar'].map(
          (label, index) => (
            <li
              key={label}
              aria-current={step === index ? 'step' : undefined}
              className={`rounded-md px-2 py-2 text-center text-xs sm:text-sm ${step === index ? 'bg-success font-medium text-white' : 'bg-gray-100 text-textTertiary'}`}
            >
              {index + 1}. {label}
            </li>
          )
        )}
      </ol>
      <div
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        aria-busy={Boolean(loading)}
      >
        {jobId ? (
          <div className="space-y-3 py-10 text-center" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <p className="text-xl font-semibold">Importación en cola</p>
            <p className="text-sm text-textTertiary">
              Podés cerrar esta ventana. La sincronización continuará en segundo
              plano.
            </p>
            <Link href="/admin/jobs" className="underline">
              Ver trabajos de importación
            </Link>
          </div>
        ) : step === 0 ? (
          <UploadStep controller={controller} />
        ) : step === 1 ? (
          <CollectionImportMapping controller={controller} gifts={gifts} />
        ) : (
          <CollectionImportPreview controller={controller} />
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-xs text-textTertiary">
          {loading === 'import'
            ? 'Guardando y enviando a la cola…'
            : loading === 'preview'
              ? 'Calculando altas, bajas y coincidencias…'
              : 'Leyendo archivo…'}
        </p>
      )}
      <DialogFooter className="shrink-0 border-t pt-4">
        {jobId ? (
          <Button
            type="button"
            variant="success"
            onClick={() => controller.handleOpenChange(false)}
          >
            Cerrar
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(loading)}
              onClick={() =>
                step === 0
                  ? controller.handleOpenChange(false)
                  : controller.back()
              }
            >
              {step === 0 ? 'Cancelar' : 'Atrás'}
            </Button>
            <Button
              type="submit"
              variant="success"
              disabled={
                Boolean(loading) ||
                (step === 0 && !controller.dataset) ||
                (step === 2 && !canAccept)
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 0
                ? 'Relacionar datos'
                : step === 1
                  ? 'Revisar cambios'
                  : `Aceptar y procesar ${valid} ${valid === 1 ? 'colección' : 'colecciones'}`}
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  )
}
