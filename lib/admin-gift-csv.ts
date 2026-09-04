import { buildCsv } from '@/lib/csv'

type CsvGift = {
  id: string
  name: string
  categoryId: string
  giftlistIds: string[]
  price: string
  image: { url: string | null } | null
}

type CsvCategory = {
  id: string
  name: string
  eventTypeIds: string[]
}

type CsvGiftlist = {
  id: string
  name: string
}

type CsvEventType = {
  id: string
  name: string
}

const CSV_HEADERS = [
  'Regalo',
  'Categoría',
  'Colecciones',
  'Precio (Gs.)',
  'Imagen URL',
  'Tipos de evento',
]

const spanishCollator = new Intl.Collator('es-PY', { sensitivity: 'base' })

export function buildAdminGiftsCsv({
  gifts,
  categories,
  giftlists,
  eventTypes,
}: {
  gifts: CsvGift[]
  categories: CsvCategory[]
  giftlists: CsvGiftlist[]
  eventTypes: CsvEventType[]
}) {
  const categoryById = new Map(
    categories.map(category => [category.id, category])
  )
  const giftlistNameById = new Map(
    giftlists.map(giftlist => [giftlist.id, giftlist.name])
  )
  const eventTypeNameById = new Map(
    eventTypes.map(eventType => [eventType.id, eventType.name])
  )
  const rows = [CSV_HEADERS]

  for (const gift of [...gifts].sort((left, right) =>
    spanishCollator.compare(left.name, right.name)
  )) {
    const category = categoryById.get(gift.categoryId)
    const giftlistNames = gift.giftlistIds
      .map(
        giftlistId =>
          giftlistNameById.get(giftlistId) ?? 'Colección no encontrada'
      )
      .sort(spanishCollator.compare)
      .join('; ')
    const eventTypeNames = (category?.eventTypeIds ?? [])
      .flatMap(eventTypeId => {
        const name = eventTypeNameById.get(eventTypeId)
        return name ? [name] : []
      })
      .sort(spanishCollator.compare)
      .join('; ')

    rows.push([
      gift.name,
      category?.name ?? 'Sin categoría',
      giftlistNames,
      gift.price,
      gift.image?.url ?? '',
      eventTypeNames,
    ])
  }

  return buildCsv(rows)
}
