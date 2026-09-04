import { describe, expect, it } from 'vitest'
import {
  buildAdminGiftlistsCsv,
  sanitizeCsvFilename,
} from '@/lib/admin-giftlist-csv'

const categories = [
  { id: 'category-1', name: 'Dormitorio' },
  { id: 'category-2', name: 'Baño' },
]

const gifts = [
  {
    id: 'gift-1',
    name: 'Zapatitos',
    categoryId: 'category-1',
    price: '250000',
    image: { url: 'https://example.com/zapatitos.jpg' },
  },
  {
    id: 'gift-2',
    name: 'Almohada',
    categoryId: 'category-2',
    price: '150000',
    image: null,
  },
]

describe('buildAdminGiftlistsCsv', () => {
  it('sorts collections and gifts by name and exports the catalog fields', () => {
    const csv = buildAdminGiftlistsCsv({
      giftlists: [
        {
          name: 'Segunda colección',
          giftIds: ['gift-1'],
          eventTypes: [{ name: 'Baby shower' }],
        },
        {
          name: 'Primera colección',
          giftIds: ['gift-1', 'gift-2'],
          eventTypes: [{ name: 'Cumpleaños' }, { name: 'Baby shower' }],
        },
      ],
      gifts,
      categories,
    })

    expect(csv).toBe(
      '\uFEFFColección,Regalo,Categoría,Precio (Gs.),Imagen URL,Tipos de evento\r\n' +
        'Primera colección,Almohada,Baño,150000,,Baby shower; Cumpleaños\r\n' +
        'Primera colección,Zapatitos,Dormitorio,250000,https://example.com/zapatitos.jpg,Baby shower; Cumpleaños\r\n' +
        'Segunda colección,Zapatitos,Dormitorio,250000,https://example.com/zapatitos.jpg,Baby shower\r\n'
    )
  })

  it('escapes commas, quotes, and line breaks', () => {
    const csv = buildAdminGiftlistsCsv({
      giftlists: [
        {
          name: 'Cocina, baño',
          giftIds: ['gift-special'],
          eventTypes: [{ name: '15 años' }],
        },
      ],
      gifts: [
        {
          id: 'gift-special',
          name: 'Set "Premium"\nGrande',
          categoryId: 'category-1',
          price: '100000',
          image: null,
        },
      ],
      categories,
    })

    expect(csv).toContain(
      '"Cocina, baño","Set ""Premium""\nGrande",Dormitorio,100000,,15 años'
    )
  })

  it('retains an empty collection with blank gift fields', () => {
    const csv = buildAdminGiftlistsCsv({
      giftlists: [
        {
          name: 'Sin regalos',
          giftIds: [],
          eventTypes: [],
        },
      ],
      gifts,
      categories,
    })

    expect(csv).toContain('Sin regalos,,,,,\r\n')
  })

  it('exports only the collections passed to it', () => {
    const csv = buildAdminGiftlistsCsv({
      giftlists: [
        {
          name: 'Resultado filtrado',
          giftIds: ['gift-1'],
          eventTypes: [],
        },
      ],
      gifts,
      categories,
    })

    expect(csv).toContain('Resultado filtrado')
    expect(csv).not.toContain('Primera colección')
  })
})

describe('sanitizeCsvFilename', () => {
  it('preserves readable names while removing unsafe filename characters', () => {
    expect(sanitizeCsvFilename('  Bebé: baño / esenciales?.  ')).toBe(
      'Bebé- baño - esenciales'
    )
  })

  it('uses a fallback when no usable characters remain', () => {
    expect(sanitizeCsvFilename('///')).toBe('coleccion')
    expect(sanitizeCsvFilename('   ')).toBe('coleccion')
  })
})
