import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { utils, write } from 'xlsx'
import { readGiftImportFile } from '@/lib/gift-import-file'

const csv = 'Nombre,Precio,Categoría\nSofá,150000,Hogar'
function excel(bookType: 'xlsx' | 'xls', sheets: Record<string, unknown[][]>) {
  const book = utils.book_new()
  for (const [name, matrix] of Object.entries(sheets))
    utils.book_append_sheet(book, utils.aoa_to_sheet(matrix), name)
  return new Uint8Array(write(book, { type: 'array', bookType }))
}

describe('gift import file reader', () => {
  it('reads BOMs, quoted delimiters, escaped quotes, and multiline cells', () => {
    const [result] = readGiftImportFile(
      'gifts.csv',
      strToU8(
        '\uFEFFNombre,Precio,Categoría\r\n"Sofá, ""living""",150000,"Hogar\nCasa"\r\n'
      )
    )
    expect(result.headers).toEqual(['Nombre', 'Precio', 'Categoría'])
    expect(result.rows).toEqual([
      { rowNumber: 2, cells: ['Sofá, "living"', '150000', 'Hogar\nCasa'] },
    ])
  })

  it.each([';', '\t'])(
    'detects %s-delimited CSVs without coercing prices',
    delimiter => {
      const [result] = readGiftImportFile(
        'gifts.csv',
        strToU8(`Nombre${delimiter}Precio\nCuna${delimiter}150.000`)
      )
      expect(result.rows[0].cells).toEqual(['Cuna', '150.000'])
    }
  )

  it('supports Excel separator hints, blank rows, and unnamed/duplicate headers', () => {
    const [result] = readGiftImportFile(
      'gifts.csv',
      strToU8('sep=;\nNombre;Nombre;\nSofá;;150000\n;;\nCuna;;200000')
    )
    expect(result.headers).toEqual(['Nombre', 'Nombre', ''])
    expect(result.rows.map(row => row.rowNumber)).toEqual([2, 4])
  })

  it.each([
    'Nombre,Precio\n"Sin cierre,150000',
    'Nombre,Precio\n"Sofá"oops,150000',
    'Nombre,Precio\nSof"á,150000',
  ])('rejects malformed quoting', value => {
    expect(() => readGiftImportFile('gifts.csv', strToU8(value))).toThrow(
      /comilla/
    )
  })

  it.each(['xlsx', 'xls'] as const)(
    'reads %s workbooks and offers each non-empty sheet separately',
    extension => {
      const results = readGiftImportFile(
        `gifts.${extension}`,
        excel(extension, {
          Hogar: [
            ['Nombre', 'Precio'],
            ['Sofá', 150000],
          ],
          Bebes: [
            ['Nombre', 'Precio'],
            ['Cuna', 200000],
          ],
          Empty: [],
        })
      )
      expect(results).toHaveLength(2)
      expect(results[0].name).toBe(`gifts.${extension} · Hogar`)
      expect(results[0].rows[0].cells).toEqual(['Sofá', '150000'])
    }
  )

  it('lists spreadsheets in nested ZIP directories and ignores other files', () => {
    const archive = zipSync({
      'export/gifts.csv': strToU8(csv),
      'more.xlsx': excel('xlsx', {
        Sheet1: [
          ['Nombre', 'Precio'],
          ['Cuna', 200000],
        ],
      }),
      'photo.jpg': new Uint8Array([1, 2, 3]),
      '__MACOSX/._gifts.csv': strToU8(csv),
    })
    expect(
      readGiftImportFile('export.zip', archive).map(dataset => dataset.name)
    ).toEqual(['export/gifts.csv', 'more.xlsx · Sheet1'])
  })

  it('rejects empty, corrupt, unsupported and oversized uploads', () => {
    expect(() => readGiftImportFile('empty.csv', new Uint8Array())).toThrow(
      'vacío'
    )
    expect(() =>
      readGiftImportFile('data.csv', strToU8('Nombre,Precio'))
    ).toThrow('No se encontraron')
    expect(() => readGiftImportFile('data.xlsx', strToU8(csv))).toThrow(
      'Excel válido'
    )
    expect(() => readGiftImportFile('data.zip', strToU8(csv))).toThrow(
      'ZIP no es válido'
    )
    expect(() => readGiftImportFile('data.pdf', strToU8(csv))).toThrow(
      'CSV, XLSX, XLS o ZIP'
    )
    expect(() =>
      readGiftImportFile('data.csv', new Uint8Array(10 * 1024 * 1024 + 1))
    ).toThrow('supera 10 MB')
  })

  it('caps decompressed files and workbook content', () => {
    const oversized = zipSync({ 'data.csv': new Uint8Array(11 * 1024 * 1024) })
    expect(() => readGiftImportFile('data.zip', oversized)).toThrow(
      'supera 10 MB'
    )
    const oversizedWorkbook = zipSync({
      'xl/big.xml': new Uint8Array(41 * 1024 * 1024),
    })
    expect(() => readGiftImportFile('data.xlsx', oversizedWorkbook)).toThrow(
      'supera 40 MB'
    )
  })

  it('rejects excess rows, columns and cell sizes instead of silently truncating', () => {
    const rows = `Nombre\n${Array.from({ length: 10_001 }, () => 'Sofá').join('\n')}`
    expect(() => readGiftImportFile('data.csv', strToU8(rows))).toThrow('10000')
    expect(() =>
      readGiftImportFile(
        'data.csv',
        strToU8(
          `${Array.from({ length: 101 }, () => 'Nombre').join(',')}\nSofá`
        )
      )
    ).toThrow('100')
    expect(() =>
      readGiftImportFile('data.csv', strToU8(`Nombre\n${'a'.repeat(4097)}`))
    ).toThrow('4.096')
    expect(() =>
      readGiftImportFile(
        'data.xlsx',
        excel('xlsx', {
          Sheet1: [
            ['Nombre'],
            ...Array.from({ length: 10_001 }, () => ['Sofá']),
          ],
        })
      )
    ).toThrow('10000')
  })
})
