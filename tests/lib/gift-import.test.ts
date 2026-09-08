import { describe, expect, it } from 'vitest'
import {
  autoMatchGiftImportHeaders,
  buildGiftImportPreview,
  cleanImportCollectionName,
  filterGiftImportPreview,
  getGiftImportErrorTypes,
  mapGiftImportRows,
  parseImportPrice,
} from '@/lib/gift-import'
import { buildGiftNameScopeKey } from '@/lib/gift-name'
import {
  type GiftImportCatalog,
  type GiftImportRow,
  GiftImportRowsSchema,
} from '@/schemas/gift-import'

const catalog: GiftImportCatalog = {
  categories: [
    { id: 'home', name: 'Hogar', eventTypeIds: ['wedding', 'birthday'] },
    { id: 'baby', name: 'Bebés', eventTypeIds: ['baby-shower'] },
  ],
  eventTypes: [
    { id: 'wedding', name: 'Casamiento', key: 'WEDDING' },
    { id: 'birthday', name: 'Cumpleaños', key: 'BIRTHDAY' },
    { id: 'baby-shower', name: 'Baby Shower', key: 'BABY_SHOWER' },
  ],
  collections: [
    {
      id: 'starter',
      name: 'Primera casa',
      giftCount: 1,
      eventTypeIds: ['wedding'],
    },
    { id: 'empty', name: 'Nueva', giftCount: 0, eventTypeIds: [] },
  ],
}
const row: GiftImportRow = {
  rowNumber: 2,
  name: 'Sofá',
  price: 'Gs. 150.000',
  category: 'Hogar',
  collections: '',
  eventTypes: '',
  imageUrl: '',
}

describe('gift import matching and preview', () => {
  it('matches Spanish, English and Portuguese headers without accents', () => {
    const result = autoMatchGiftImportHeaders([
      'Nome',
      'Precio (Gs.)',
      'Categorías',
      'Collections',
      'Tipo de evento',
      'Image URL',
      'Tipo',
    ])
    expect(Object.values(result).map(value => value.column)).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })

  it('matches headers used by the Notion wedding export', () => {
    const result = autoMatchGiftImportHeaders([
      'Nome',
      'Categoria',
      'Colecciones',
      'Valor del regalo',
      'Event type',
      'Imagen',
      'Imagen URL',
    ])

    expect(result.name.column).toBe(0)
    expect(result.category.column).toBe(1)
    expect(result.collections.column).toBe(2)
    expect(result.price.column).toBe(3)
    expect(result.eventTypes.column).toBe(4)
    expect(result.imageUrl.column).toBe(6)
  })

  it('does not treat an attachment/image column as an image URL', () => {
    const result = autoMatchGiftImportHeaders(['Imagen', 'Image', 'Foto'])

    expect(result.imageUrl.column).toBeNull()
  })

  it('ignores an Individual CSV column because gift type belongs to the wishlist', () => {
    const mapping = autoMatchGiftImportHeaders([
      'Nombre',
      'Precio',
      'Categoría',
      'Individual',
    ])
    const [result] = mapGiftImportRows(
      {
        name: 'gifts.csv',
        headers: ['Nombre', 'Precio', 'Categoría', 'Individual'],
        rows: [
          { rowNumber: 2, cells: ['Sofá', '1000', 'Hogar', 'Grupal'] },
        ],
      },
      mapping,
      { category: {}, collections: {}, eventTypes: {} }
    )

    expect(result).toEqual({
      rowNumber: 2,
      name: 'Sofá',
      price: '1000',
      category: 'Hogar',
      collections: '',
      eventTypes: '',
      imageUrl: '',
    })
  })

  it('removes trailing Notion relation links from collection names', () => {
    expect(
      cleanImportCollectionName(
        'Luna de miel Tokyo (https://app.notion.com/p/Luna-de-miel-Tokyo-123?pvs=21)'
      )
    ).toBe('Luna de miel Tokyo')
    expect(cleanImportCollectionName('Luna de miel Tokyo (edición 2026)')).toBe(
      'Luna de miel Tokyo (edición 2026)'
    )
  })

  it('leaves ambiguous and missing headers for manual assignment', () => {
    expect(
      autoMatchGiftImportHeaders(['Nombre', 'Name', 'Tipo']).name.column
    ).toBeNull()
    expect(autoMatchGiftImportHeaders(['Tipo']).eventTypes.column).toBeNull()
  })

  it('applies fixed values, blank-cell fallbacks, and per-value relationship overrides', () => {
    const mapping = autoMatchGiftImportHeaders([
      'Nombre',
      'Precio',
      'Categoría',
      'Colecciones',
    ])
    mapping.price.value = '100.000'
    mapping.eventTypes.value = 'wedding'
    const result = mapGiftImportRows(
      {
        name: 'test',
        headers: ['Nombre', 'Precio', 'Categoría', 'Colecciones'],
        rows: [
          { rowNumber: 7, cells: ['Sofá', '', 'Casa', 'Primera; Favoritos'] },
        ],
      },
      mapping,
      {
        category: { Casa: 'home' },
        collections: { Primera: 'starter', Favoritos: 'empty' },
        eventTypes: {},
      }
    )
    expect(result).toEqual([
      {
        ...row,
        rowNumber: 7,
        price: '100.000',
        category: 'home',
        collections: 'starter|empty',
        eventTypes: 'wedding',
      },
    ])
  })

  it('cleans every Notion collection relation before matching it', () => {
    const mapping = autoMatchGiftImportHeaders([
      'Nome',
      'Colecciones',
      'Valor del regalo',
      'Categoria',
    ])
    const result = mapGiftImportRows(
      {
        name: 'notion.csv',
        headers: ['Nome', 'Colecciones', 'Valor del regalo', 'Categoria'],
        rows: [
          {
            rowNumber: 2,
            cells: [
              'Gift Card',
              'Luna de miel Tokyo (https://app.notion.com/p/Tokyo-123?pvs=21), Luna de miel Barbados (https://app.notion.com/p/Barbados-456?pvs=21)',
              '500.000',
              'Luna de miel',
            ],
          },
        ],
      },
      mapping,
      {
        category: {},
        collections: {
          'Luna de miel Tokyo': 'tokyo',
          'Luna de miel Barbados': 'barbados',
        },
        eventTypes: {},
      }
    )

    expect(result[0].collections).toBe('tokyo|barbados')
  })

  it.each(['150000', 'Gs. 150.000', '₲150,000', '150 000 PYG', '000150000'])(
    'reads whole guaraníes: %s',
    value => {
      expect(parseImportPrice(value)).toBe('150000')
    }
  )

  it.each([
    '',
    '999',
    '100000000',
    '-1000',
    '1e4',
    'NaN',
    '10.50',
    '1,234.50',
    '1200USD',
    '12.34.567',
    'gratis',
    '1000.00',
  ])('rejects invalid or fractional amounts: %s', value => {
    expect(parseImportPrice(value)).toBeNull()
  })

  it('requires only name, whole price, and category and inherits every category event type', () => {
    const [result] = buildGiftImportPreview([row], catalog)
    expect(result.errors).toEqual([])
    expect(result.eventTypes).toEqual(['Casamiento', 'Cumpleaños'])
    expect(result.values).toEqual({
      name: 'Sofá',
      price: '150000',
      categoryId: 'home',
      giftlistIds: [],
      newGiftlistNames: [],
      imageUrl: '',
    })
  })

  it('validates the existing admin name rule and reports invalid prices/categories', () => {
    const [result] = buildGiftImportPreview(
      [{ ...row, name: ' ', price: 'foo', category: 'missing' }],
      catalog
    )
    expect(result.errors).toHaveLength(3)
    expect(result.values).toBeNull()
    expect(
      buildGiftImportPreview(
        [{ ...row, name: 'x'.repeat(257) }],
        catalog
      )[0].errors.join()
    ).toContain('demasiado largo')
  })

  it('matches relationship names and IDs and validates every requested event type', () => {
    const [valid] = buildGiftImportPreview(
      [
        {
          ...row,
          category: 'home',
          collections: 'Primera casa|empty',
          eventTypes: 'WEDDING, Cumpleanos',
        },
      ],
      catalog
    )
    expect(valid.errors).toEqual([])
    expect(valid.values?.giftlistIds).toEqual(['starter', 'empty'])
    const [invalid] = buildGiftImportPreview(
      [{ ...row, eventTypes: 'Casamiento, Baby Shower' }],
      catalog
    )
    expect(invalid.errors.join()).toContain('no admite todos')
  })

  it('rejects unknown relations and categories without valid event types', () => {
    expect(
      buildGiftImportPreview(
        [{ ...row, collections: 'missing', eventTypes: 'missing' }],
        catalog
      )[0].errors
    ).toHaveLength(2)
    for (const ids of [[], ['deleted']]) {
      const [result] = buildGiftImportPreview([row], {
        ...catalog,
        categories: [{ ...catalog.categories[0], eventTypeIds: ids }],
      })
      expect(result.errors.join()).toContain('tipos de evento existentes')
    }
  })

  it('refuses to guess when two collections normalize to the same label', () => {
    const ambiguous: GiftImportCatalog = {
      ...catalog,
      collections: [
        ...catalog.collections,
        { id: 'other', name: 'primera-casa', giftCount: 0, eventTypeIds: [] },
      ],
    }
    expect(
      buildGiftImportPreview(
        [{ ...row, collections: 'Primera casa' }],
        ambiguous
      )[0].errors.join()
    ).toContain('sin coincidencia')
    expect(
      buildGiftImportPreview([{ ...row, collections: 'starter' }], ambiguous)[0]
        .values?.giftlistIds
    ).toEqual(['starter'])
  })

  it('can propose every unmatched collection for creation', () => {
    const [result] = buildGiftImportPreview(
      [{ ...row, collections: 'Luna de miel Tokyo|Luna de miel Barbados' }],
      catalog,
      new Set(),
      true
    )

    expect(result.errors).toEqual([])
    expect(result.values?.giftlistIds).toEqual([])
    expect(result.values?.newGiftlistNames).toEqual([
      'Luna de miel Tokyo',
      'Luna de miel Barbados',
    ])
  })

  it('validates names and complete category compatibility for new collections', () => {
    expect(
      buildGiftImportPreview(
        [{ ...row, collections: 'x'.repeat(61) }],
        catalog,
        new Set(),
        true
      )[0].errors.join()
    ).toContain('No se puede crear la colección')

    const results = buildGiftImportPreview(
      [
        { ...row, collections: 'Nueva colección importada' },
        {
          ...row,
          rowNumber: 3,
          name: 'Cuna',
          category: 'baby',
          collections: 'Nueva colección importada',
        },
      ],
      catalog,
      new Set(),
      true
    )
    expect(
      results.every(result => result.errors.join().includes('no compartirían'))
    ).toBe(true)
  })

  it.each([
    'file:///image.png',
    'images/sofa.jpg',
    'javascript:alert(1)',
    'https://user:pass@example.com/image.jpg',
  ])('rejects unsafe or local image locations: %s', imageUrl => {
    expect(
      buildGiftImportPreview([{ ...row, imageUrl }], catalog)[0].errors.join()
    ).toContain('imagen debe ser una URL')
  })

  it('accepts HTTP(S) images without requiring an image', () => {
    expect(
      buildGiftImportPreview(
        [{ ...row, imageUrl: 'https://example.com/sofa.jpg' }],
        catalog
      )[0].errors
    ).toEqual([])
  })

  it('marks every repeated name in a category and existing catalog duplicates', () => {
    const duplicate = { ...row, rowNumber: 3, name: ' SOFÁ ' }
    expect(
      buildGiftImportPreview([row, duplicate], catalog).every(result =>
        result.errors.join().includes('Nombre repetido')
      )
    ).toBe(true)
    const existing = new Set([
      buildGiftNameScopeKey({
        name: row.name,
        categoryId: 'home',
        isDefault: true,
      }),
    ])
    expect(
      buildGiftImportPreview([row], catalog, existing)[0].errors.join()
    ).toContain('ya existe en la base de datos de Wedin')
    expect(
      buildGiftImportPreview(
        [row, { ...duplicate, category: 'baby' }],
        catalog
      ).every(result => !result.errors.length)
    ).toBe(true)
  })

  it('rejects a collection incompatible with the category', () => {
    const [result] = buildGiftImportPreview(
      [{ ...row, category: 'Bebés', collections: 'starter' }],
      catalog
    )
    expect(result.errors.join()).toContain('no compartirían un tipo de evento')
  })

  it('checks batch compatibility even when the collection starts empty', () => {
    const results = buildGiftImportPreview(
      [
        { ...row, collections: 'empty' },
        {
          ...row,
          rowNumber: 3,
          name: 'Cuna',
          category: 'baby',
          collections: 'empty',
        },
      ],
      catalog
    )
    expect(
      results.every(result => result.errors.join().includes('no compartirían'))
    ).toBe(true)
  })

  it('rejects three pairwise-compatible categories with no shared event type', () => {
    const categories = [
      ['wedding', 'birthday'],
      ['birthday', 'baby-shower'],
      ['baby-shower', 'wedding'],
    ].map((eventTypeIds, index) => ({
      id: String(index),
      name: `Category ${index}`,
      eventTypeIds,
    }))
    const results = buildGiftImportPreview(
      categories.map((category, index) => ({
        ...row,
        rowNumber: index + 2,
        category: category.id,
        collections: 'empty',
      })),
      { ...catalog, categories }
    )
    expect(
      results.every(result => result.errors.join().includes('no compartirían'))
    ).toBe(true)
  })

  it('rejects duplicate row identities, oversized input, and injected admin fields', () => {
    expect(GiftImportRowsSchema.safeParse([row, row]).success).toBe(false)
    expect(
      GiftImportRowsSchema.safeParse([{ ...row, isDefault: false }]).success
    ).toBe(false)
    expect(
      GiftImportRowsSchema.safeParse(
        Array.from({ length: 10_001 }, (_, index) => ({
          ...row,
          rowNumber: index + 1,
        }))
      ).success
    ).toBe(false)
    expect(
      GiftImportRowsSchema.safeParse(
        Array.from({ length: 10_000 }, (_, index) => ({
          ...row,
          rowNumber: index + 1,
          imageUrl: 'a'.repeat(2000),
        }))
      ).success
    ).toBe(false)
  })
})

describe('import error filters', () => {
  it('filters by error type while retaining every error on matching rows', () => {
    const rows = buildGiftImportPreview(
      [
        row,
        {
          ...row,
          rowNumber: 3,
          name: 'Bad price',
          price: 'bad',
          imageUrl: 'local.jpg',
        },
        { ...row, rowNumber: 4, name: 'Bad category', category: 'missing' },
      ],
      catalog
    )
    expect(filterGiftImportPreview(rows, 'all')).toBe(rows)
    expect(
      filterGiftImportPreview(rows, 'valid').map(row => row.rowNumber)
    ).toEqual([2])
    expect(filterGiftImportPreview(rows, 'errors')).toHaveLength(2)
    expect(filterGiftImportPreview(rows, 'price')).toEqual([rows[1]])
    expect(filterGiftImportPreview(rows, 'image')).toEqual([rows[1]])
    expect(filterGiftImportPreview(rows, 'category')).toEqual([rows[2]])
    expect(rows[1].errors).toHaveLength(2)
  })
  it('distinguishes database duplicates, file duplicates, and collection compatibility', () => {
    const existingKeys = new Set([
      buildGiftNameScopeKey({
        name: row.name,
        categoryId: 'home',
        isDefault: true,
      }),
    ])
    const rows = buildGiftImportPreview(
      [row, { ...row, rowNumber: 3 }],
      catalog,
      existingKeys
    )
    expect(filterGiftImportPreview(rows, 'existing_gift')).toHaveLength(2)
    expect(filterGiftImportPreview(rows, 'duplicate_row')).toHaveLength(2)
    const incompatible = buildGiftImportPreview(
      [{ ...row, category: 'Bebés', collections: 'Primera casa' }],
      catalog
    )
    expect(
      filterGiftImportPreview(incompatible, 'collection_compatibility')
    ).toHaveLength(1)
  })
  it('supports older saved previews without typed errors', () => {
    const [old] = buildGiftImportPreview(
      [{ ...row, price: 'invalid' }],
      catalog
    )
    delete old.errorTypes
    expect(getGiftImportErrorTypes(old)).toEqual(['price'])
  })
})
