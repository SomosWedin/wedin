import { buildGiftNameScopeKey } from '@/lib/gift-name'
import { AdminGiftCreateSchema, GiftlistNameSchema } from '@/schemas/form'
import {
  type GiftImportCatalog,
  type GiftImportDataset,
  type GiftImportErrorType,
  type GiftImportMapping,
  type GiftImportPreviewRow,
  type GiftImportReviewFilter,
  type GiftImportRow,
  type GiftImportValueMatches,
  giftImportFields,
  MAX_IMPORT_UPLOAD_ROWS,
} from '@/schemas/gift-import'

export function normalizeImportLabel(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]/g, '')
}

const headerAliases = {
  name: [
    'nombre',
    'nombre del regalo',
    'nombre del producto',
    'name',
    'gift name',
    'product name',
    'nome',
    'regalo',
    'producto',
    'title',
    'titulo',
  ],
  price: [
    'precio',
    'precio gs',
    'precio pyg',
    'price',
    'price pyg',
    'precio guaranies',
    'valor',
    'preco',
    'importe',
    'monto',
    'valor del regalo',
  ],
  category: [
    'categoria',
    'categorias',
    'category',
    'categories',
    'category id',
    'rubro',
  ],
  collections: [
    'coleccion',
    'colecciones',
    'collection',
    'collections',
    'giftlist',
    'giftlists',
    'listas predefinidas',
    'colecoes',
  ],
  eventTypes: [
    'tipo de evento',
    'tipos de evento',
    'event type',
    'event types',
    'eventtype',
    'evento',
    'event',
    'tipo evento',
  ],
  imageUrl: [
    'image url',
    'imagen url',
    'url imagen',
    'url de imagen',
    'url de la imagen',
    'image link',
    'enlace de imagen',
    'foto url',
  ],
}

export function autoMatchGiftImportHeaders(
  headers: string[]
): GiftImportMapping {
  return Object.fromEntries(
    giftImportFields.map(({ key }) => {
      const aliases = headerAliases[key].map(normalizeImportLabel)
      const matches = headers.flatMap((header, index) =>
        aliases.includes(normalizeImportLabel(header)) ? [index] : []
      )
      return [
        key,
        { column: matches.length === 1 ? matches[0] : null, value: '' },
      ]
    })
  ) as GiftImportMapping
}

export function splitImportValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,;|\n]/)
        .map(part => part.trim())
        .filter(Boolean)
    )
  )
}

const notionCollectionLinkSuffix =
  /\s*\(\s*https?:\/\/(?:app\.notion\.com|(?:www\.)?notion\.so)\/[^)]*\)\s*$/i

export function cleanImportCollectionName(value: string) {
  return value.replace(notionCollectionLinkSuffix, '').trim()
}

export function splitImportRelationValues(
  field: 'collections' | 'eventTypes',
  value: string
) {
  return splitImportValues(value)
    .map(item =>
      field === 'collections' ? cleanImportCollectionName(item) : item
    )
    .filter(Boolean)
}

export function getImportCell(
  cells: string[],
  mapping: GiftImportMapping[keyof GiftImportMapping]
) {
  return (
    mapping.column === null
      ? mapping.value
      : cells[mapping.column] || mapping.value
  ).trim()
}

export function mapGiftImportRows(
  dataset: GiftImportDataset,
  mapping: GiftImportMapping,
  matches: GiftImportValueMatches
): GiftImportRow[] {
  return dataset.rows.map(({ rowNumber, cells }) => {
    const fields = Object.fromEntries(
      giftImportFields.map(({ key }) => [
        key,
        getImportCell(cells, mapping[key]),
      ])
    ) as Omit<GiftImportRow, 'rowNumber'>
    fields.category = matches.category[fields.category] || fields.category
    for (const field of ['collections', 'eventTypes'] as const) {
      fields[field] = splitImportRelationValues(field, fields[field])
        .map(value => matches[field][value] || value)
        .join('|')
    }
    return { rowNumber, ...fields }
  })
}

export function parseImportPrice(value: string): string | null {
  const amount = value
    .trim()
    .replace(/^(?:Gs\.?|PYG|₲)\s*/i, '')
    .replace(/\s*(?:Gs\.?|PYG|₲)$/i, '')
    .trim()
  if (
    !/^(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:[ \u00a0]\d{3})+)$/.test(
      amount
    )
  )
    return null
  const number = Number(amount.replace(/[., \u00a0]/g, ''))
  return Number.isSafeInteger(number) && number >= 1000 && number <= 99999999
    ? String(number)
    : null
}

type ImportOption = { id: string; name: string; key?: string }
export type ImportOptionIndex<T extends ImportOption> = {
  byId: Map<string, T>
  byLabel: Map<string, T | null>
}

export function buildImportOptionIndex<T extends ImportOption>(
  options: T[]
): ImportOptionIndex<T> {
  const byId = new Map<string, T>()
  const byLabel = new Map<string, T | null>()
  for (const option of options) {
    if (!byId.has(option.id)) byId.set(option.id, option)
    const nameLabel = normalizeImportLabel(option.name)
    const keyLabel = option.key ? normalizeImportLabel(option.key) : ''
    const labels =
      keyLabel && keyLabel !== nameLabel ? [nameLabel, keyLabel] : [nameLabel]
    for (const label of labels) {
      if (!label) continue
      byLabel.set(label, byLabel.has(label) ? null : option)
    }
  }
  return { byId, byLabel }
}

export function findIndexedImportOption<T extends ImportOption>(
  value: string,
  index: ImportOptionIndex<T>
) {
  const exact = index.byId.get(value)
  if (exact) return exact
  const label = normalizeImportLabel(value)
  if (!label) return undefined
  return index.byLabel.get(label) ?? undefined
}

export function findImportOption<T extends ImportOption>(
  value: string,
  options: T[]
) {
  return findIndexedImportOption(value, buildImportOptionIndex(options))
}

export function buildGiftImportPreview(
  rows: GiftImportRow[],
  catalog: GiftImportCatalog,
  existingNameKeys: Set<string> = new Set(),
  createMissingCollections = false
): GiftImportPreviewRow[] {
  const categoryIndex = buildImportOptionIndex(catalog.categories)
  const collectionIndex = buildImportOptionIndex(catalog.collections)
  const eventTypeIndex = buildImportOptionIndex(catalog.eventTypes)
  const preview = rows.map((row): GiftImportPreviewRow => {
    const errors: string[] = []
    const errorTypes: GiftImportErrorType[] = []
    const addError = (type: GiftImportErrorType, message: string) => {
      errors.push(message)
      if (!errorTypes.includes(type)) errorTypes.push(type)
    }
    const name = row.name.trim()
    const price = parseImportPrice(row.price)
    const category = findIndexedImportOption(row.category, categoryIndex)
    const collections = splitImportRelationValues(
      'collections',
      row.collections
    )
      .map(value => {
        const collection = findIndexedImportOption(value, collectionIndex)
        if (collection) return { ...collection, isNew: false as const }
        if (!createMissingCollections) {
          addError('collections', `Colección sin coincidencia: ${value}.`)
          return null
        }
        const parsedName = GiftlistNameSchema.safeParse(value)
        if (!parsedName.success) {
          addError(
            'collections',
            `No se puede crear la colección «${value}»: ${parsedName.error.issues[0]?.message ?? 'nombre inválido'}.`
          )
          return null
        }
        return {
          id: null,
          name: parsedName.data,
          giftCount: 0,
          eventTypeIds: [] as string[],
          isNew: true as const,
        }
      })
      .filter(value => value !== null)
    const requestedEventTypes = splitImportRelationValues(
      'eventTypes',
      row.eventTypes
    )
      .map(value => {
        const eventType = findIndexedImportOption(value, eventTypeIndex)
        if (!eventType)
          addError('event_types', `Tipo de evento sin coincidencia: ${value}.`)
        return eventType
      })
      .filter((value): value is GiftImportCatalog['eventTypes'][number] =>
        Boolean(value)
      )

    if (!price)
      addError(
        'price',
        'El precio debe ser un entero entre Gs. 1.000 y Gs. 99.999.999.'
      )
    if (!category)
      addError(
        'category',
        row.category
          ? `Categoría sin coincidencia: ${row.category}.`
          : 'Seleccioná una categoría.'
      )
    if (
      category &&
      (category.eventTypeIds.length === 0 ||
        category.eventTypeIds.some(
          id => !catalog.eventTypes.some(type => type.id === id)
        ))
    ) {
      addError(
        'event_types',
        'La categoría debe tener tipos de evento existentes asignados.'
      )
    }
    if (
      category &&
      requestedEventTypes.some(type => !category.eventTypeIds.includes(type.id))
    ) {
      addError(
        'event_types',
        'La categoría no admite todos los tipos de evento indicados.'
      )
    }
    const imageUrl = row.imageUrl.trim()
    if (imageUrl) {
      try {
        const url = new URL(imageUrl)
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password
        )
          throw new Error()
      } catch {
        addError(
          'image',
          'La imagen debe ser una URL pública http(s); las rutas de archivos no son válidas.'
        )
      }
    }
    const parsed = AdminGiftCreateSchema.safeParse({
      name,
      price: price ?? '',
      categoryId: category?.id ?? '',
      giftlistIds: Array.from(
        new Set(
          collections.flatMap(collection =>
            collection.isNew ? [] : [collection.id]
          )
        )
      ),
      imageUrl,
    })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'name') addError('name', issue.message)
      }
    }
    if (
      category &&
      existingNameKeys.has(
        buildGiftNameScopeKey({
          name,
          categoryId: category.id,
          isDefault: true,
        })
      )
    ) {
      addError(
        'existing_gift',
        'Este regalo ya existe en la base de datos de Wedin con el mismo nombre y categoría. No se creará de nuevo.'
      )
    }
    return {
      rowNumber: row.rowNumber,
      name,
      price: price ?? row.price,
      category: category?.name ?? row.category,
      collections: collections.map(collection => collection.name),
      eventTypes:
        category?.eventTypeIds.map(
          id => catalog.eventTypes.find(type => type.id === id)?.name ?? id
        ) ?? [],
      imageUrl,
      errors,
      errorTypes,
      values: parsed.success
        ? {
          ...parsed.data,
          newGiftlistNames: Array.from(
            new Map(
              collections.flatMap(collection =>
                collection.isNew
                  ? [
                    [
                      collection.name.toLocaleLowerCase('es-PY'),
                      collection.name,
                    ] as const,
                  ]
                  : []
              )
            ).values()
          ),
        }
        : null,
    }
  })

  const byName = new Map<string, GiftImportPreviewRow[]>()
  for (const row of preview) {
    if (!row.values) continue
    const key = buildGiftNameScopeKey({ ...row.values, isDefault: true })
    const group = byName.get(key) ?? []
    group.push(row)
    byName.set(key, group)
  }
  for (const duplicates of Array.from(byName.values())) {
    if (duplicates.length > 1) {
      const rowNumbers =
        duplicates
          .slice(0, 8)
          .map(duplicate => duplicate.rowNumber)
          .join(', ') + (duplicates.length > 8 ? '…' : '')
      for (const row of duplicates) {
        row.errorTypes?.push('duplicate_row')
        row.errors.push(
          `Nombre repetido en esta categoría en las filas ${rowNumbers}.`
        )
      }
    }
  }

  const newCollections = Array.from(
    new Map(
      preview.flatMap(row =>
        (row.values?.newGiftlistNames ?? []).map(
          name => [name.toLocaleLowerCase('es-PY'), name] as const
        )
      )
    ).entries()
  ).map(([key, name]) => ({
    key,
    name,
    giftCount: 0,
    eventTypeIds: [] as string[],
    isNew: true as const,
  }))

  // Check the complete proposed collection, including all incoming categories.
  // Pairwise checks alone can accept a batch with no common event type.
  for (const collection of [
    ...catalog.collections.map(collection => ({
      ...collection,
      key: collection.id,
      isNew: false as const,
    })),
    ...newCollections,
  ]) {
    const incoming = preview.filter(
      row =>
        row.errors.length === 0 &&
        (collection.isNew
          ? row.values?.newGiftlistNames.some(
            name => name.toLocaleLowerCase('es-PY') === collection.key
          )
          : row.values?.giftlistIds.includes(collection.key))
    )
    if (!incoming.length) continue
    const groups = incoming.map(
      row =>
        catalog.categories.find(
          category => category.id === row.values?.categoryId
        )?.eventTypeIds ?? []
    )
    if (collection.giftCount > 0) groups.unshift(collection.eventTypeIds)
    if (!groups[0].some(id => groups.every(group => group.includes(id)))) {
      for (const row of incoming) {
        row.errorTypes?.push('collection_compatibility')
        row.errors.push(
          `Los regalos de «${collection.name}» no compartirían un tipo de evento. Cambiá la categoría o la colección.`
        )
      }
    }
  }
  return preview
}

export function chunkGiftImportRows(rows: GiftImportRow[]) {
  const chunks: GiftImportRow[][] = []
  let chunk: GiftImportRow[] = []
  let bytes = 0
  for (const row of rows) {
    const size = new TextEncoder().encode(JSON.stringify(row)).length + 1
    if (
      chunk.length &&
      (chunk.length === MAX_IMPORT_UPLOAD_ROWS || bytes + size > 550_000)
    ) {
      chunks.push(chunk)
      chunk = []
      bytes = 0
    }
    chunk.push(row)
    bytes += size
  }
  if (chunk.length) chunks.push(chunk)
  return chunks
}

export function getGiftImportErrorTypes(
  row: GiftImportPreviewRow
): GiftImportErrorType[] {
  if (row.errorTypes) return Array.from(new Set(row.errorTypes))
  // Jobs reviewed before typed errors were introduced retain their original messages.
  return Array.from(
    new Set(
      row.errors.map((message): GiftImportErrorType => {
        if (message.startsWith('Este regalo ya existe')) return 'existing_gift'
        if (message.startsWith('Nombre repetido')) return 'duplicate_row'
        if (message.startsWith('El nombre')) return 'name'
        if (message.startsWith('El precio')) return 'price'
        if (
          message.startsWith('Categoría') ||
          message.startsWith('Seleccioná una categoría')
        )
          return 'category'
        if (
          message.startsWith('Tipo de evento') ||
          message.startsWith('La categoría')
        )
          return 'event_types'
        if (
          message.startsWith('Colección') ||
          message.startsWith('No se puede crear la colección')
        )
          return 'collections'
        if (message.startsWith('Los regalos de'))
          return 'collection_compatibility'
        if (message.startsWith('La imagen')) return 'image'
        return 'other'
      })
    )
  )
}

export function filterGiftImportPreview(
  rows: GiftImportPreviewRow[],
  filter: GiftImportReviewFilter
) {
  if (filter === 'all') return rows
  if (filter === 'valid')
    return rows.filter(row => !row.errors.length && row.values)
  if (filter === 'errors')
    return rows.filter(row => row.errors.length || !row.values)
  return rows.filter(row => getGiftImportErrorTypes(row).includes(filter))
}
