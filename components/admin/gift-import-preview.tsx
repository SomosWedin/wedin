'use client'

import { useRef, useState } from 'react'
import { ImportSelect } from '@/components/admin/gift-import-mapping'
import ExistingImportGiftDialog from '@/components/dialog/existing-import-gift-dialog'
import { Button } from '@/components/ui/button'
import type { AdminGiftImportController } from '@/hooks/dialog/forms/use-admin-gift-import'
import {
  filterGiftImportPreview,
  getGiftImportErrorTypes,
} from '@/lib/gift-import'
import {
  type GiftImportErrorType,
  type GiftImportReviewFilter,
  giftImportErrorLabels,
} from '@/schemas/gift-import'

export default function GiftImportPreview({
  controller,
}: {
  controller: AdminGiftImportController
}) {
  const { preview, skipErrors, setSkipErrors, loading } = controller
  const [filter, setFilter] = useState<GiftImportReviewFilter>('all')
  const [page, setPage] = useState(0)
  const [existingGiftId, setExistingGiftId] = useState<string | null>(null)
  const existingGiftTrigger = useRef<HTMLButtonElement | null>(null)
  const invalidCount = preview.filter(
    row => row.errors.length || !row.values
  ).length
  const newCollections = Array.from(
    new Map(
      preview.flatMap(row =>
        row.errors.length || !row.values
          ? []
          : row.values.newGiftlistNames.map(
              name => [name.toLocaleLowerCase('es-PY'), name] as const
            )
      )
    ).values()
  )
  const errorCounts = new Map<GiftImportErrorType, number>()
  for (const row of preview) {
    for (const type of getGiftImportErrorTypes(row))
      errorCounts.set(type, (errorCounts.get(type) ?? 0) + 1)
  }
  const visibleRows = filterGiftImportPreview(preview, filter)
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / 20))
  const currentPage = Math.min(page, pageCount - 1)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Filas', preview.length],
          ['Listos para crear', preview.length - invalidCount],
          ['Con errores', invalidCount],
        ].map(([label, count]) => (
          <div key={label} className="rounded-lg border bg-gray-50 p-3">
            <p className="text-xl font-semibold">{count}</p>
            <p className="text-xs text-textTertiary">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-textTertiary">
        Se crearán regalos en el catálogo con las categorías y colecciones
        indicadas. Los regalos aparecerán en los tipos de evento de su
        categoría. Las listas de los organizadores, sus regalos y sus pagos
        actuales no cambian.
      </p>
      {newCollections.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <p className="font-medium">
            {newCollections.length === 1
              ? 'Se creará 1 colección nueva'
              : `Se crearán ${newCollections.length} colecciones nuevas`}
          </p>
          <p className="mt-1 break-words text-textTertiary">
            {newCollections.slice(0, 8).join(', ')}
            {newCollections.length > 8 && ` y ${newCollections.length - 8} más`}
          </p>
        </div>
      )}
      {invalidCount > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>
            Hay {invalidCount}{' '}
            {invalidCount === 1
              ? 'fila que no se puede crear'
              : 'filas que no se pueden crear'}
            . Volvé a relacionar los campos o aceptá omitirlas.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={skipErrors}
              disabled={Boolean(loading)}
              onChange={event => setSkipErrors(event.target.checked)}
            />
            <span>
              Omitir {invalidCount} {invalidCount === 1 ? 'fila' : 'filas'} con
              errores e importar {preview.length - invalidCount}{' '}
              {preview.length - invalidCount === 1
                ? 'regalo válido'
                : 'regalos válidos'}
              .
            </span>
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-80">
          <ImportSelect
            label="Filtrar filas de la revisión"
            value={filter}
            onChange={value => {
              setFilter(value as GiftImportReviewFilter)
              setPage(0)
            }}
            options={[
              { value: 'all', label: `Todas las filas (${preview.length})` },
              {
                value: 'valid',
                label: `Listos para crear (${preview.length - invalidCount})`,
              },
              { value: 'errors', label: `Todos los errores (${invalidCount})` },
              ...Object.entries(giftImportErrorLabels).flatMap(
                ([value, label]) => {
                  const count =
                    errorCounts.get(value as GiftImportErrorType) ?? 0
                  return count || filter === value
                    ? [{ value, label: `${label} (${count})` }]
                    : []
                }
              ),
            ]}
          />
        </div>
        <p className="text-xs text-textTertiary" role="status">
          Mostrando {visibleRows.length} de {preview.length} filas. El filtro no
          cambia qué filas se importan.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">
            Revisión de regalos a importar, con errores por fila
          </caption>
          <thead className="bg-gray-50 text-xs text-textTertiary">
            <tr>
              {[
                'Fila',
                'Regalo / imagen',
                'Precio (Gs.)',
                'Categoría / eventos',
                'Colecciones',
                'Resultado',
              ].map(label => (
                <th key={label} scope="col" className="p-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibleRows
              .slice(currentPage * 20, (currentPage + 1) * 20)
              .map(row => (
                <tr
                  key={row.rowNumber}
                  className={row.errors.length ? 'bg-red-50/50' : ''}
                >
                  <td className="p-3 align-top text-textTertiary">
                    {row.rowNumber}
                  </td>
                  <td className="max-w-52 break-words p-3 align-top">
                    <p className="font-medium">{row.name || 'Sin nombre'}</p>
                    {/^https?:\/\//i.test(row.imageUrl) &&
                    !row.errors.some(error => error.startsWith('La imagen')) ? (
                      <a
                        className="mt-1 inline-block text-xs underline"
                        href={row.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver imagen
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-textTertiary">
                        {row.imageUrl ? 'Imagen sin validar' : 'Sin imagen'}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 align-top tabular-nums">
                    {/^\d+$/.test(row.price)
                      ? Number(row.price).toLocaleString('es-PY')
                      : row.price || 'Sin precio'}
                  </td>
                  <td className="p-3 align-top">
                    <p>{row.category || 'Sin categoría'}</p>
                    <p className="mt-1 text-xs text-textTertiary">
                      {row.eventTypes.join(', ')}
                    </p>
                  </td>
                  <td className="p-3 align-top">
                    {row.collections.join(', ') || 'Sin colección'}
                  </td>
                  <td className="min-w-52 max-w-72 p-3 align-top">
                    {row.errors.length ? (
                      <ul className="list-inside list-disc space-y-1 text-xs text-red-700">
                        {row.errors.map(error => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-green-700">Listo para crear</span>
                    )}
                    {row.existingGiftId && (
                      <Button
                        type="button"
                        variant="link"
                        className="mt-2 h-auto p-0 text-xs"
                        disabled={Boolean(loading)}
                        aria-label={`Ver regalo existente: ${row.name}`}
                        onClick={event => {
                          existingGiftTrigger.current = event.currentTarget
                          setExistingGiftId(row.existingGiftId ?? null)
                        }}
                      >
                        Ver regalo existente
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            {!visibleRows.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-textTertiary">
                  No hay filas que coincidan con este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-textTertiary">
        <span>
          Página {currentPage + 1} de {pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
      <ExistingImportGiftDialog
        giftId={existingGiftId}
        onClose={() => setExistingGiftId(null)}
        restoreFocus={() =>
          existingGiftTrigger.current?.focus({ preventScroll: true })
        }
      />
    </div>
  )
}
