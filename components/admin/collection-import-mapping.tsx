'use client'

import { ImportSelect } from '@/components/admin/gift-import-mapping'
import { Combobox } from '@/components/ui/combobox'
import type { AdminCollectionImportController } from '@/hooks/dialog/forms/use-admin-collection-import'
import { parseCollectionGiftReferences } from '@/lib/collection-import'
import { normalizeImportLabel } from '@/lib/gift-import'
import type { CollectionImportGift } from '@/schemas/collection-import'
import { collectionImportFields } from '@/schemas/collection-import'

export default function CollectionImportMapping({
  controller,
  gifts,
}: {
  controller: AdminCollectionImportController
  gifts: CollectionImportGift[]
}) {
  const { dataset, mapping, matches, updateMapping, setMatches } = controller
  if (!dataset) return null
  const selection = mapping.gifts
  const references =
    selection.column === null
      ? parseCollectionGiftReferences(selection.value)
      : dataset.rows.flatMap(row =>
          parseCollectionGiftReferences(
            row.cells[selection.column as number] || selection.value
          )
        )
  const uniqueReferences = Array.from(
    new Map(
      references.map(reference => [reference.sourceKey, reference])
    ).values()
  )
  const candidates = (name: string) =>
    gifts.filter(
      gift => normalizeImportLabel(gift.name) === normalizeImportLabel(name)
    )
  const unresolved = uniqueReferences.filter(reference => {
    if (matches[reference.sourceKey]) return false
    return candidates(reference.name).length !== 1
  })

  return (
    <div className="space-y-5">
      <p className="text-sm text-textTertiary">
        Relacioná el nombre de la colección y su lista de regalos. La
        importación reemplazará exactamente los regalos de cada colección
        incluida.
      </p>
      <div className="divide-y rounded-lg border">
        {collectionImportFields.map(field => {
          const selected = mapping[field.key]
          return (
            <div
              key={field.key}
              className="grid gap-3 p-3 sm:grid-cols-[1fr_1.4fr_1.4fr]"
            >
              <div>
                <p className="text-sm font-medium">{field.label} *</p>
                <p className="text-xs text-textTertiary">Obligatorio</p>
              </div>
              <ImportSelect
                label={`Columna para ${field.label}`}
                value={
                  selected.column === null ? 'fixed' : String(selected.column)
                }
                onChange={value =>
                  updateMapping(field.key, {
                    ...selected,
                    column: value === 'fixed' ? null : Number(value),
                  })
                }
                options={[
                  { value: 'fixed', label: 'Asignar valor / sin columna' },
                  ...dataset.headers.map((header, index) => ({
                    value: String(index),
                    label: `${index + 1}. ${header || 'Sin encabezado'}`,
                  })),
                ]}
              />
              <input
                aria-label={`Valor asignado: ${field.label}`}
                className="h-10 rounded-md border px-3 text-sm"
                value={selected.value}
                onChange={event =>
                  updateMapping(field.key, {
                    ...selected,
                    value: event.target.value,
                  })
                }
                placeholder="Valor de respaldo"
              />
            </div>
          )
        })}
      </div>
      <p className="text-xs text-textTertiary">
        Se reconocen relaciones de Notion con el formato Nombre (URL). También
        podés separar nombres simples con punto y coma, | o saltos de línea.
      </p>
      <details
        className="rounded-lg border p-3"
        open={unresolved.length > 0 || undefined}
      >
        <summary className="cursor-pointer text-sm font-medium">
          Relación de regalos: {uniqueReferences.length} referencias ·{' '}
          {unresolved.length
            ? `${unresolved.length} requieren revisión`
            : 'todas relacionadas'}
        </summary>
        <p className="mt-2 text-xs text-textTertiary">
          Los nombres únicos se relacionan automáticamente. Una referencia sin
          selección se mostrará como ignorada en la revisión.
        </p>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {unresolved.map(reference => {
            const exact = candidates(reference.name)
            return (
              <div
                key={reference.sourceKey}
                className="grid gap-2 rounded-md bg-gray-50 p-2 sm:grid-cols-2"
              >
                <div>
                  <p className="break-words text-sm">{reference.name}</p>
                  <p className="text-xs text-textTertiary">
                    {exact.length
                      ? `${exact.length} coincidencias por nombre`
                      : 'Sin coincidencia por nombre'}
                  </p>
                </div>
                <Combobox
                  options={gifts.map(gift => ({
                    value: gift.id,
                    label: `${gift.name} · ${gift.categoryName}`,
                  }))}
                  selected={matches[reference.sourceKey] || ''}
                  selectionMode="value"
                  clearable
                  placeholder="No agregar este regalo"
                  onChange={value =>
                    setMatches(current => ({
                      ...current,
                      [reference.sourceKey]: String(value),
                    }))
                  }
                />
              </div>
            )
          })}
          {!unresolved.length && (
            <p className="text-sm text-textTertiary">
              No hay referencias que requieran una selección manual.
            </p>
          )}
        </div>
      </details>
    </div>
  )
}
