import { describe, expect, it } from 'vitest'
import { buildAdminGiftsCsv } from '@/lib/admin-gift-csv'

const categories = [
  {
    id: 'category-1',
    name: 'Dormitorio',
    eventTypeIds: ['event-2', 'event-1'],
  },
]

const giftlists = [
  { id: 'list-1', name: 'Primeros meses' },
  { id: 'list-2', name: 'Esenciales' },
]

const eventTypes = [
  { id: 'event-1', name: 'Baby shower' },
  { id: 'event-2', name: 'Cumpleaños' },
]

const gifts = [
  {
    id: 'gift-1',
    name: 'Zapatitos',
    categoryId: 'category-1',
    giftlistIds: ['list-1', 'list-2'],
    price: '250000',
    image: { url: 'https://example.com/zapatitos.jpg' },
  },
  {
    id: 'gift-2',
    name: 'Almohada',
    categoryId: 'category-1',
    giftlistIds: [],
    price: '150000',
    image: null,
  },
]

describe('buildAdminGiftsCsv', () => {
  it('sorts gifts by name and exports their catalog fields', () => {
    const csv = buildAdminGiftsCsv({
      gifts,
      categories,
      giftlists,
      eventTypes,
    })

    expect(csv).toBe(
      '\uFEFFRegalo,Categoría,Colecciones,Precio (Gs.),Imagen URL,Tipos de evento\r\n' +
        'Almohada,Dormitorio,,150000,,Baby shower; Cumpleaños\r\n' +
        'Zapatitos,Dormitorio,Esenciales; Primeros meses,250000,https://example.com/zapatitos.jpg,Baby shower; Cumpleaños\r\n'
    )
  })

  it('escapes exported values for CSV', () => {
    const csv = buildAdminGiftsCsv({
      gifts: [
        {
          ...gifts[0],
          name: 'Set "Premium", grande',
        },
      ],
      categories,
      giftlists,
      eventTypes,
    })

    expect(csv).toContain('"Set ""Premium"", grande"')
  })

  it('exports only the filtered gift subset passed to it', () => {
    const csv = buildAdminGiftsCsv({
      gifts: [gifts[1]],
      categories,
      giftlists,
      eventTypes,
    })

    expect(csv).toContain('Almohada')
    expect(csv).not.toContain('Zapatitos')
  })

  it('uses readable fallbacks for missing relationships', () => {
    const csv = buildAdminGiftsCsv({
      gifts: [
        {
          ...gifts[0],
          categoryId: 'missing-category',
          giftlistIds: ['missing-list'],
        },
      ],
      categories,
      giftlists,
      eventTypes,
    })

    expect(csv).toContain(
      'Zapatitos,Sin categoría,Colección no encontrada,250000,https://example.com/zapatitos.jpg,'
    )
  })
})
