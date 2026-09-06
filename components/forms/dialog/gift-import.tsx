'use client'

import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useId, useState } from 'react'
import GiftImportMapping, {
  ImportSelect,
} from '@/components/admin/gift-import-mapping'
import GiftImportPreview from '@/components/admin/gift-import-preview'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import type { AdminGiftImportController } from '@/hooks/dialog/forms/use-admin-gift-import'
import { type GiftImportCatalog, MAX_IMPORT_ROWS } from '@/schemas/gift-import'

function UploadStep({ controller }: { controller: AdminGiftImportController }) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const {
    dataset,
    datasets,
    datasetIndex,
    fileName,
    upload,
    loading,
    setDatasetIndex,
  } = controller
  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors focus-within:ring-2 focus-within:ring-success ${dragging ? 'border-success bg-gray-100' : 'border-gray-200 bg-gray-50'}`}
        onDragOver={event => {
          event.preventDefault()
          if (!loading) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          if (!loading && event.dataTransfer.files[0])
            void upload(event.dataTransfer.files[0])
        }}
      >
        <Upload
          className="mx-auto mb-3 h-8 w-8 text-textTertiary"
          aria-hidden="true"
        />
        <p className="font-medium">Arrastrá tu archivo aquí</p>
        <p className="mt-1 text-sm text-textTertiary">
          CSV, Excel (.xlsx, .xls) o un ZIP que los contenga
        </p>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          aria-label="Archivo de regalos"
          accept=".csv,.xlsx,.xls,.zip"
          disabled={Boolean(loading)}
          onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void upload(file)
          }}
        />
        <span className="mt-4 inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm font-medium">
          {loading === 'file' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Leyendo archivo…
            </>
          ) : (
            'Seleccionar archivo'
          )}
        </span>
        <p className="mt-3 text-xs text-textTertiary">
          Hasta 10 MB y {MAX_IMPORT_ROWS} regalos por importación. La primera
          fila debe contener los encabezados.
        </p>
      </label>
      <p className="text-sm text-textTertiary">
        Obligatorios: nombre (hasta 256 caracteres), precio (Gs. 1.000 a Gs.
        99.999.999) y categoría. Podés asignar campos faltantes en el siguiente
        paso. Imagen y colecciones son opcionales.
      </p>
      {dataset && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-5 w-5 shrink-0" />
            <span className="break-all font-medium">{fileName}</span>
          </div>
          {datasets.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm">
                Elegí el archivo o la hoja a importar. Podés importar los demás
                después.
              </p>
              <ImportSelect
                label="Archivo u hoja a importar"
                value={String(datasetIndex)}
                onChange={value => setDatasetIndex(Number(value))}
                options={datasets.map((item, index) => ({
                  value: String(index),
                  label: `${item.name} (${item.rows.length} filas)`,
                }))}
              />
            </div>
          )}
          <p className="text-sm text-textTertiary">
            {dataset.rows.length} filas · {dataset.headers.length} columnas
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">
                Primeras tres filas del archivo
              </caption>
              <thead className="bg-gray-50">
                <tr>
                  {dataset.headers.map((header, index) => (
                    <th
                      // biome-ignore lint/suspicious/noArrayIndexKey: Column positions are stable identifiers, including duplicate headers.
                      key={`${index}-${header}`}
                      className="min-w-32 p-2 font-medium"
                      scope="col"
                    >
                      {header || `Columna ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {dataset.rows.slice(0, 3).map(row => (
                  <tr key={row.rowNumber}>
                    {row.cells.map((cell, index) => (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: File columns never reorder within this preview.
                        key={`${row.rowNumber}-${index}`}
                        className="max-w-52 truncate p-2"
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

export default function GiftImportForm({
  controller,
  catalog,
}: {
  controller: AdminGiftImportController
  catalog: GiftImportCatalog
}) {
  const { step, loading, error, jobId, preview, skipErrors } = controller
  const validCount = preview.filter(
    row => row.errors.length === 0 && row.values
  ).length
  const canAccept =
    validCount > 0 && (validCount === preview.length || skipErrors)
  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      onSubmit={event => {
        event.preventDefault()
        if (loading || jobId !== null) return
        if (step === 0) controller.next()
        else if (step === 1) void controller.review()
        else if (canAccept) void controller.accept()
      }}
    >
      <ol
        aria-label="Pasos de importación"
        className="grid shrink-0 grid-cols-3 gap-2"
      >
        {['Subir archivo', 'Relacionar campos', 'Revisar y aceptar'].map(
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
        {jobId !== null ? (
          <div className="space-y-3 py-10 text-center" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <p className="text-xl font-semibold">Importación en cola</p>
            <p className="text-sm text-textTertiary">
              Podés cerrar esta ventana. La importación continuará en segundo
              plano.
            </p>
            <Link href="/admin/jobs" className="inline-block underline">
              Ver trabajos de importación
            </Link>
          </div>
        ) : step === 0 ? (
          <UploadStep controller={controller} />
        ) : step === 1 ? (
          <GiftImportMapping controller={controller} catalog={catalog} />
        ) : (
          <GiftImportPreview controller={controller} />
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="shrink-0 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-xs text-textTertiary">
          {loading === 'import'
            ? 'Guardando y enviando la importación a la cola…'
            : loading === 'preview'
              ? 'Validando categorías, colecciones y regalos existentes…'
              : 'Leyendo el archivo…'}
        </p>
      )}
      <DialogFooter className="shrink-0 border-t pt-4">
        {jobId !== null ? (
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
              className="min-h-10 h-auto min-w-0 whitespace-normal py-2"
              disabled={
                Boolean(loading) ||
                (step === 0 && !controller.dataset) ||
                (step === 2 && !canAccept)
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 0
                ? 'Relacionar campos'
                : step === 1
                  ? 'Revisar regalos'
                  : `Aceptar e importar ${validCount} ${validCount === 1 ? 'regalo' : 'regalos'}`}
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  )
}
