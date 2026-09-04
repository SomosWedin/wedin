type CsvGiftlist = {
  name: string
  giftIds: string[]
  eventTypes: { name: string }[]
}

type CsvGift = {
  id: string
  name: string
  categoryId: string
  price: string
  image: { url: string | null } | null
}

type CsvCategory = {
  id: string
  name: string
}

const CSV_HEADERS = [
  'Colección',
  'Regalo',
  'Categoría',
  'Precio (Gs.)',
  'Imagen URL',
  'Tipos de evento',
]

const spanishCollator = new Intl.Collator('es-PY', { sensitivity: 'base' })

function escapeCsvValue(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function csvLine(values: string[]) {
  return values.map(escapeCsvValue).join(',')
}

export function buildAdminGiftlistsCsv({
  giftlists,
  gifts,
  categories,
}: {
  giftlists: CsvGiftlist[]
  gifts: CsvGift[]
  categories: CsvCategory[]
}) {
  const giftById = new Map(gifts.map(gift => [gift.id, gift]))
  const categoryNameById = new Map(
    categories.map(category => [category.id, category.name])
  )
  const rows = [CSV_HEADERS]

  for (const giftlist of [...giftlists].sort((left, right) =>
    spanishCollator.compare(left.name, right.name)
  )) {
    const eventTypeNames = [...giftlist.eventTypes]
      .sort((left, right) => spanishCollator.compare(left.name, right.name))
      .map(eventType => eventType.name)
      .join('; ')
    const giftlistGifts = Array.from(new Set(giftlist.giftIds))
      .flatMap(giftId => {
        const gift = giftById.get(giftId)
        return gift ? [gift] : []
      })
      .sort((left, right) => spanishCollator.compare(left.name, right.name))

    if (giftlistGifts.length === 0) {
      rows.push([giftlist.name, '', '', '', '', eventTypeNames])
      continue
    }

    for (const gift of giftlistGifts) {
      rows.push([
        giftlist.name,
        gift.name,
        categoryNameById.get(gift.categoryId) ?? 'Sin categoría',
        gift.price,
        gift.image?.url ?? '',
        eventTypeNames,
      ])
    }
  }

  return `\uFEFF${rows.map(csvLine).join('\r\n')}\r\n`
}

export function sanitizeCsvFilename(name: string) {
  const sanitized = name
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .replace(/^-+|-+$/g, '')
    .trim()

  return sanitized || 'coleccion'
}
