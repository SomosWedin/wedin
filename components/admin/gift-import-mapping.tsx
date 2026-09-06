'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdminGiftImportController } from '@/hooks/dialog/forms/use-admin-gift-import'
import {
  findImportOption,
  getImportCell,
  splitImportRelationValues,
  splitImportValues,
} from '@/lib/gift-import'
import {
  type GiftImportCatalog,
  type GiftImportField,
  type GiftImportRelation,
  giftImportFields,
} from '@/schemas/gift-import'

export function ImportSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white">
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function relationOptions(
  field: GiftImportRelation,
  catalog: GiftImportCatalog
): { id: string; name: string; key?: string }[] {
  if (field === 'category') return catalog.categories
  return catalog[field]
}

function FixedValue({
  field,
  value,
  onChange,
  catalog,
}: {
  field: GiftImportField
  value: string
  onChange: (value: string) => void
  catalog: GiftImportCatalog
}) {
  if (field === 'category')
    return (
      <ImportSelect
        label="Categoría asignada"
        value={value || 'none'}
        onChange={next => onChange(next === 'none' ? '' : next)}
        options={[
          { value: 'none', label: 'Seleccionar categoría' },
          ...catalog.categories.map(category => ({
            value: category.id,
            label: `${category.name} (${
              category.eventTypeIds
                .map(
                  id => catalog.eventTypes.find(type => type.id === id)?.name
                )
                .filter(Boolean)
                .join(', ') || 'Sin tipos de evento'
            })`,
          })),
        ]}
      />
    )
  if (field === 'collections' || field === 'eventTypes') {
    const ids = splitImportValues(value)
    return (
      <fieldset className="max-h-32 overflow-auto rounded-md border bg-white p-2 text-sm">
        <legend className="sr-only">
          {field === 'collections'
            ? 'Colecciones asignadas'
            : 'Tipos de evento asignados'}
        </legend>
        {catalog[field].length ? (
          catalog[field].map(option => (
            <label
              key={option.id}
              className="flex items-center gap-2 px-1 py-1.5"
            >
              <input
                type="checkbox"
                checked={ids.includes(option.id)}
                onChange={event =>
                  onChange(
                    (event.target.checked
                      ? [...ids, option.id]
                      : ids.filter(id => id !== option.id)
                    ).join('|')
                  )
                }
              />
              {option.name}
            </label>
          ))
        ) : (
          <p className="text-textTertiary">No hay opciones disponibles.</p>
        )}
      </fieldset>
    )
  }
  return (
    <Input
      aria-label={`Valor asignado: ${giftImportFields.find(item => item.key === field)?.label}`}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={
        field === 'price'
          ? 'Ej. 150.000'
          : field === 'imageUrl'
            ? 'https://...'
            : 'Escribir valor'
      }
    />
  )
}

export default function GiftImportMapping({
  controller,
  catalog,
}: {
  controller: AdminGiftImportController
  catalog: GiftImportCatalog
}) {
  const {
    dataset,
    mapping,
    matches,
    createMissingCollections,
    updateMapping,
    matchValue,
    setCreateMissingCollections,
  } = controller
  if (!dataset) return null
  return (
    <div className="space-y-5">
      <p className="text-sm text-textTertiary">
        Relacioná cada campo con una columna o asigná un valor para todas las
        filas. Si una celda está vacía, se usará el valor de respaldo.
      </p>
      <div className="divide-y rounded-lg border">
        <div className="hidden grid-cols-[1fr_1.4fr_1.4fr] gap-4 rounded-t-lg bg-gray-50 p-3 text-xs font-medium text-textTertiary sm:grid">
          <span>Campo de Wedin</span>
          <span>Columna del archivo</span>
          <span>Valor asignado / respaldo</span>
        </div>
        {giftImportFields.map(field => {
          const selection = mapping[field.key]
          const sampleValues =
            selection.column === null
              ? []
              : dataset.rows.flatMap(row => {
                  const value = row.cells[selection.column as number]
                  if (!value) return []
                  return field.key === 'collections'
                    ? splitImportRelationValues('collections', value)
                    : [value]
                })
          const uniqueSamples = Array.from(new Set(sampleValues))
          const sampleLimit = field.key === 'collections' ? 3 : 2
          const samples = uniqueSamples.slice(0, sampleLimit)
          const remainingSamples = uniqueSamples.length - samples.length
          return (
            <div
              key={field.key}
              className="grid gap-3 p-3 sm:grid-cols-[1fr_1.4fr_1.4fr] sm:gap-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-600"> *</span>}
                </p>
                <p className="mt-1 text-xs text-textTertiary">
                  {field.required ? 'Obligatorio' : 'Opcional'}
                </p>
              </div>
              <div className="min-w-0 space-y-2">
                <ImportSelect
                  label={`Columna para ${field.label}`}
                  value={
                    selection.column === null
                      ? 'fixed'
                      : String(selection.column)
                  }
                  onChange={value =>
                    updateMapping(field.key, {
                      ...selection,
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
                {samples.length > 0 && (
                  <p className="break-words text-xs text-textTertiary">
                    Ej.: {samples.join(' · ')}
                    {remainingSamples > 0 && ` · +${remainingSamples} más`}
                  </p>
                )}
              </div>
              <FixedValue
                field={field.key}
                value={selection.value}
                onChange={value =>
                  updateMapping(field.key, { ...selection, value })
                }
                catalog={catalog}
              />
            </div>
          )
        })}
      </div>
      <p className="text-xs text-textTertiary">
        Separá varias colecciones o tipos de evento con coma, punto y coma o |.
        Los tipos de evento se usan para validar la categoría; la visibilidad
        del regalo se hereda de todos los tipos de su categoría. La imagen es
        opcional y debe ser una URL http(s).
      </p>
      {(['category', 'collections', 'eventTypes'] as const).map(field => {
        if (mapping[field].column === null) return null
        const values = Array.from(
          new Set(
            dataset.rows.flatMap(row => {
              const value = getImportCell(row.cells, mapping[field])
              return field === 'category'
                ? value
                  ? [value]
                  : []
                : splitImportRelationValues(field, value)
            })
          )
        )
        if (!values.length) return null
        const options = relationOptions(field, catalog)
        const unmatched = values.filter(
          value => !findImportOption(matches[field][value] || value, options)
        )
        return (
          <details
            key={field}
            className="rounded-lg border p-3"
            open={unmatched.length > 0 || undefined}
          >
            <summary className="cursor-pointer text-sm font-medium">
              {giftImportFields.find(item => item.key === field)?.label}:{' '}
              {values.length} {values.length === 1 ? 'valor' : 'valores'} ·{' '}
              {unmatched.length
                ? field === 'collections' && createMissingCollections
                  ? `${unmatched.length} por crear`
                  : `${unmatched.length} sin coincidencia`
                : 'todos relacionados'}
            </summary>
            {field === 'collections' && (
              <label className="mt-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={createMissingCollections}
                  onChange={event =>
                    setCreateMissingCollections(event.target.checked)
                  }
                />
                <span>
                  Crear automáticamente todas las colecciones sin coincidencia.
                  Se usarán los nombres limpios del archivo y la revisión
                  validará sus categorías y tipos de evento.
                </span>
              </label>
            )}
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {values.map(value => {
                const match = findImportOption(
                  matches[field][value] || value,
                  options
                )
                return (
                  <div
                    key={value}
                    className="grid items-center gap-2 rounded-md bg-gray-50 p-2 sm:grid-cols-2"
                  >
                    <p className="break-words text-sm">{value}</p>
                    {field === 'collections' &&
                    createMissingCollections &&
                    !match ? (
                      <span className="text-sm font-medium text-blue-700">
                        Se creará
                      </span>
                    ) : (
                      <ImportSelect
                        label={`Relacionar ${value}`}
                        value={match?.id ?? 'unmatched'}
                        onChange={target =>
                          matchValue(
                            field,
                            value,
                            target === 'unmatched' ? '' : target
                          )
                        }
                        options={[
                          { value: 'unmatched', label: 'Sin coincidencia' },
                          ...options.map(option => ({
                            value: option.id,
                            label: option.name,
                          })),
                        ]}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}
    </div>
  )
}
