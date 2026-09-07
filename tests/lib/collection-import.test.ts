import { describe, expect, it } from 'vitest'
import {
  autoMatchCollectionImportHeaders,
  chunkCollectionImportRows,
  mapCollectionImportRows,
  parseCollectionGiftReferences,
} from '@/lib/collection-import'
import { readGiftImportFile } from '@/lib/gift-import-file'

describe('collection import parsing', () => {
  it('matches the Notion collection export headers', () => {
    expect(autoMatchCollectionImportHeaders(['Nome', 'Regalos'])).toEqual({
      name: { column: 0, value: '' },
      gifts: { column: 1, value: '' },
    })
  })

  it('keeps commas inside Notion gift names and captures stable source URLs', () => {
    const value =
      'Cena para 2 - Lisboa, Portugal (https://app.notion.com/p/cena-111?pvs=21), Gift Card (https://app.notion.com/p/card-222?pvs=21)'
    expect(parseCollectionGiftReferences(value)).toEqual([
      {
        sourceKey: 'https://app.notion.com/p/cena-111?pvs=21',
        name: 'Cena para 2 - Lisboa, Portugal',
        url: 'https://app.notion.com/p/cena-111?pvs=21',
      },
      {
        sourceKey: 'https://app.notion.com/p/card-222?pvs=21',
        name: 'Gift Card',
        url: 'https://app.notion.com/p/card-222?pvs=21',
      },
    ])
  })

  it('reads collection relationship cells larger than the gift field limit', () => {
    const relation = Array.from(
      { length: 55 },
      (_, index) =>
        `Experiencia extensa número ${index} ${'x'.repeat(70)} (https://app.notion.com/p/item-${index}?pvs=21)`
    ).join(', ')
    expect(relation.length).toBeGreaterThan(4096)
    const csv = `Nome,Regalos\nColección,"${relation}"\n`
    const [dataset] = readGiftImportFile(
      'colecciones.csv',
      new TextEncoder().encode(csv)
    )
    expect(dataset.rows[0].cells[1]).toBe(relation)
    expect(parseCollectionGiftReferences(relation)).toHaveLength(55)
  })

  it('persists manual matches by source reference and chunks bounded uploads', () => {
    const dataset = {
      name: 'Colecciones.csv',
      headers: ['Nome', 'Regalos'],
      rows: [
        {
          rowNumber: 2,
          cells: [
            'Luna de miel',
            'Cena (https://app.notion.com/p/cena?pvs=21)',
          ],
        },
      ],
    }
    const rows = mapCollectionImportRows(
      dataset,
      autoMatchCollectionImportHeaders(dataset.headers),
      {
        'https://app.notion.com/p/cena?pvs=21': '1234567890abcdef12345678',
      }
    )
    expect(rows[0].gifts[0].giftId).toBe('1234567890abcdef12345678')
    expect(chunkCollectionImportRows(rows).flat()).toEqual(rows)
  })
})
