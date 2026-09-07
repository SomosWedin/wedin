'use client'

import { useMemo, useState } from 'react'
import { ImportSelect } from '@/components/admin/gift-import-mapping'
import { Button } from '@/components/ui/button'
import type { AdminCollectionImportController } from '@/hooks/dialog/forms/use-admin-collection-import'
import { filterCollectionImportPreview } from '@/lib/collection-import'
import type { CollectionImportReviewFilter } from '@/schemas/collection-import'

const actionLabels = {
  create: 'Se creará',
  update: 'Se actualizará',
  unchanged: 'Sin cambios',
  invalid: 'Con errores',
}

function Names({ values }: { values: { id: string; name: string }[] }) {
  return values.length ? (
    <ul className="list-inside list-disc">
      {values.map(value => (
        <li key={value.id}>{value.name}</li>
      ))}
    </ul>
  ) : (
    <span className="text-textTertiary">Ninguno</span>
  )
}

export default function CollectionImportPreview({
  controller,
}: {
  controller: AdminCollectionImportController
}) {
  const {
    preview,
    skipErrors,
    setSkipErrors,
    acknowledgeRemovals,
    setAcknowledgeRemovals,
    acknowledgeIgnored,
    setAcknowledgeIgnored,
  } = controller
  const [filter, setFilter] = useState<CollectionImportReviewFilter>('all')
  const [page, setPage] = useState(0)
  const invalidCount = preview.filter(row => row.errors.length).length
  const validRows = preview.filter(row => !row.errors.length)
  const removalCount = validRows.reduce(
    (total, row) => total + row.removed.length,
    0
  )
  const ignoredCount = validRows.reduce(
    (total, row) => total + row.ignored.length,
    0
  )
  const counts = useMemo(
    () =>
      Object.fromEntries(
        ['create', 'update', 'unchanged', 'invalid'].map(action => [
          action,
          preview.filter(row => row.action === action).length,
        ])
      ),
    [preview]
  )
  const visible = filterCollectionImportPreview(preview, filter)
  const pages = Math.max(1, Math.ceil(visible.length / 20))
  const currentPage = Math.min(page, pages - 1)

  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-sm sm:grid-cols-4">
        {(['create', 'update', 'unchanged', 'invalid'] as const).map(action => {
          const bad = action === 'invalid' && counts[action] > 0
          return (
            <div
              key={action}
              className={`rounded-md border p-3 ${bad ? 'border-red-200 bg-red-50' : 'border-borderDefault'}`}
            >
              <p className="font-medium">{actionLabels[action]}</p>
              <p
                className={`text-lg tabular-nums ${bad ? 'text-red-700' : ''}`}
              >
                {counts[action]}
              </p>
            </div>
          )
        })}
      </div>
      {invalidCount > 0 && (
        <label className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={skipErrors}
            onChange={event => setSkipErrors(event.target.checked)}
          />
          Omitir {invalidCount} colecciones con errores y procesar las válidas.
        </label>
      )}
      {removalCount > 0 && (
        <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledgeRemovals}
            onChange={event => setAcknowledgeRemovals(event.target.checked)}
          />
          Confirmo que se quitarán {removalCount} relaciones entre regalos y
          colecciones. Los regalos no se eliminarán.
        </label>
      )}
      {ignoredCount > 0 && (
        <label className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledgeIgnored}
            onChange={event => setAcknowledgeIgnored(event.target.checked)}
          />
          Confirmo que {ignoredCount} referencias no encontradas o ambiguas no
          se crearán ni se agregarán.
        </label>
      )}
      <div className="w-full sm:w-80">
        <ImportSelect
          label="Filtrar cambios"
          value={filter}
          onChange={value => {
            setFilter(value as CollectionImportReviewFilter)
            setPage(0)
          }}
          options={[
            { value: 'all', label: `Todas (${preview.length})` },
            { value: 'create', label: `Por crear (${counts.create})` },
            { value: 'update', label: `Por actualizar (${counts.update})` },
            { value: 'unchanged', label: `Sin cambios (${counts.unchanged})` },
            { value: 'invalid', label: `Con errores (${counts.invalid})` },
            {
              value: 'removals',
              label: `Con eliminaciones (${preview.filter(row => row.removed.length).length})`,
            },
            {
              value: 'ignored',
              label: `Con referencias ignoradas (${preview.filter(row => row.ignored.length).length})`,
            },
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-gray-50 text-xs text-textTertiary">
            <tr>
              {[
                'Fila / colección',
                'Agregar',
                'Quitar',
                'Conservar',
                'Resultado',
              ].map(label => (
                <th key={label} scope="col" className="p-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible
              .slice(currentPage * 20, (currentPage + 1) * 20)
              .map(row => (
                <tr
                  key={row.rowNumber}
                  className={row.errors.length ? 'bg-red-50/50' : ''}
                >
                  <td
                    className={`max-w-52 p-3 align-top ${row.errors.length ? 'border-l-2 border-l-red-400' : ''}`}
                  >
                    <p className="font-medium">{row.name || 'Sin nombre'}</p>
                    <p className="text-xs text-textTertiary">
                      Fila {row.rowNumber}
                    </p>
                    <p className="mt-1 text-xs">
                      {row.categories.join(', ') || 'Sin categorías'}
                    </p>
                    <p className="text-xs text-textTertiary">
                      {row.eventTypes.join(', ') || 'Sin tipos de evento'}
                    </p>
                  </td>
                  <td className="max-w-56 p-3 align-top">
                    <Names values={row.added} />
                  </td>
                  <td className="max-w-56 p-3 align-top">
                    <Names values={row.removed} />
                  </td>
                  <td className="max-w-56 p-3 align-top">
                    <Names values={row.retained} />
                  </td>
                  <td className="min-w-56 p-3 align-top">
                    <p
                      className={
                        row.errors.length ? 'text-red-700' : 'text-green-700'
                      }
                    >
                      {actionLabels[row.action]}
                    </p>
                    {[...row.errors, ...row.warnings].map(message => (
                      <p key={message} className="mt-1 text-xs text-red-700">
                        {message}
                      </p>
                    ))}
                    {row.ignored.map(item => (
                      <p
                        key={`${item.name}-${item.reason}`}
                        className="mt-1 text-xs text-blue-700"
                      >
                        {item.name}: {item.reason}
                      </p>
                    ))}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-6 text-center">No hay resultados para este filtro.</p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-textTertiary">
        <span>
          Página {currentPage + 1} de {pages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage + 1 >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
