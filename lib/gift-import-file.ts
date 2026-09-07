import { Unzip, UnzipInflate } from 'fflate'
import { read, utils } from 'xlsx'
import {
  type GiftImportDataset,
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from '@/schemas/gift-import'

const MAX_EXPANDED_BYTES = 40 * 1024 * 1024
const MAX_DATASETS = 20
const MAX_CELL_CHARS = 64 * 1024
const DEFAULT_CELL_CHARS = 4096
const spreadsheetExtension = /\.(csv|xlsx|xls)$/i

function readZip(data: Uint8Array, spreadsheetsOnly: boolean) {
  const files: { name: string; data: Uint8Array }[] = []
  let expandedBytes = 0
  let entryCount = 0
  let pending = 0
  const unzip = new Unzip(file => {
    entryCount++
    if (entryCount > 2000)
      throw new Error('El ZIP contiene demasiados archivos.')
    if (
      file.name.endsWith('/') ||
      (spreadsheetsOnly &&
        (!spreadsheetExtension.test(file.name) ||
          /(?:^|\/)(?:__MACOSX|\.)/.test(file.name)))
    )
      return
    if ((file.originalSize ?? 0) > MAX_EXPANDED_BYTES)
      throw new Error('El contenido descomprimido supera 40 MB.')
    if (spreadsheetsOnly && (file.originalSize ?? 0) > MAX_IMPORT_FILE_BYTES)
      throw new Error(`${file.name} supera 10 MB.`)
    if (spreadsheetsOnly && files.length >= MAX_DATASETS)
      throw new Error(
        `El ZIP puede contener hasta ${MAX_DATASETS} archivos de datos.`
      )
    const result = { name: file.name, data: new Uint8Array() }
    files.push(result)
    const chunks: Uint8Array[] = []
    let size = 0
    pending++
    file.ondata = (error, chunk, final) => {
      if (error) throw new Error(`No se pudo extraer ${file.name}.`)
      expandedBytes += chunk.length
      size += chunk.length
      if (expandedBytes > MAX_EXPANDED_BYTES)
        throw new Error('El contenido descomprimido supera 40 MB.')
      if (spreadsheetsOnly) {
        if (size > MAX_IMPORT_FILE_BYTES)
          throw new Error(`${file.name} supera 10 MB.`)
        chunks.push(chunk)
      }
      if (final) {
        pending--
        if (spreadsheetsOnly) {
          result.data = new Uint8Array(size)
          let offset = 0
          for (const part of chunks) {
            result.data.set(part, offset)
            offset += part.length
          }
        }
      }
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  for (let offset = 0; offset < data.length; offset += 16 * 1024) {
    unzip.push(
      data.subarray(offset, offset + 16 * 1024),
      offset + 16 * 1024 >= data.length
    )
  }
  if (pending) throw new Error('El ZIP está incompleto o dañado.')
  return files
}

function decodeCsv(data: Uint8Array) {
  if (data[0] === 0xff && data[1] === 0xfe)
    return new TextDecoder('utf-16le').decode(data)
  if (data[0] === 0xfe && data[1] === 0xff)
    return new TextDecoder('utf-16be').decode(data)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    return new TextDecoder('windows-1252').decode(data)
  }
}

function parseCsv(text: string): string[][] {
  let source = text.replace(/^\uFEFF/, '')
  const separatorLine = source.match(/^sep=([,;\t])\r?\n/i)
  if (separatorLine) source = source.slice(separatorLine[0].length)
  const firstRecord = source.match(/^(?:"(?:[^"]|"")*"|[^\r\n])*/)?.[0] ?? ''
  const outsideQuotes = firstRecord.replace(/"(?:[^"]|"")*"/g, '')
  const delimiter =
    separatorLine?.[1] ??
    [',', ';', '\t'].sort(
      (a, b) => outsideQuotes.split(b).length - outsideQuotes.split(a).length
    )[0]
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let closedQuote = false
  const finishCell = () => {
    row.push(cell.trim())
    if (row.length > MAX_IMPORT_COLUMNS)
      throw new Error(`El archivo supera ${MAX_IMPORT_COLUMNS} columnas.`)
    cell = ''
    closedQuote = false
  }
  const finishRow = () => {
    finishCell()
    rows.push(row)
    row = []
    if (rows.length > MAX_IMPORT_ROWS + 1)
      throw new Error(`El archivo supera ${MAX_IMPORT_ROWS} filas de datos.`)
  }
  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"'
          index++
        } else {
          quoted = false
          closedQuote = true
        }
      } else cell += character
    } else if (character === delimiter) finishCell()
    else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index++
      finishRow()
    } else if (character === '"' && !cell.trim() && !closedQuote) {
      cell = ''
      quoted = true
    } else if (closedQuote && character.trim())
      throw new Error('El CSV tiene texto después de una comilla de cierre.')
    else if (character === '"')
      throw new Error('El CSV tiene comillas sin escapar.')
    else if (!closedQuote) cell += character
    if (cell.length > MAX_CELL_CHARS) throw new Error('Una celda supera 64 KB.')
  }
  if (quoted) throw new Error('El CSV tiene una celda con comillas sin cerrar.')
  if (cell || row.length || closedQuote) finishRow()
  return rows
}

function toDataset(
  name: string,
  matrix: unknown[][]
): GiftImportDataset | null {
  const headerIndex = matrix.findIndex(row =>
    row.some(cell => String(cell ?? '').trim())
  )
  if (headerIndex < 0) return null
  const header = matrix[headerIndex]
  const width = Math.max(...matrix.map(row => row.length))
  if (width > MAX_IMPORT_COLUMNS)
    throw new Error(`${name}: máximo ${MAX_IMPORT_COLUMNS} columnas.`)
  const headers = Array.from({ length: width }, (_, index) =>
    String(header[index] ?? '').trim()
  )
  const allowsLongRelations = (header: string) =>
    ['regalos', 'gifts', 'productos', 'items'].includes(
      header.trim().toLocaleLowerCase('es')
    )
  const rows = matrix.slice(headerIndex + 1).flatMap((row, index) => {
    const cells = headers.map((_, column) => String(row[column] ?? '').trim())
    if (cells.some(cell => cell.length > MAX_CELL_CHARS))
      throw new Error(`${name}: una celda supera 64 KB.`)
    if (
      cells.some(
        (cell, column) =>
          cell.length > DEFAULT_CELL_CHARS &&
          !allowsLongRelations(headers[column])
      )
    )
      throw new Error(`${name}: una celda supera 4.096 caracteres.`)
    return cells.some(Boolean)
      ? [{ rowNumber: headerIndex + index + 2, cells }]
      : []
  })
  if (!rows.length) return null
  if (rows.length > MAX_IMPORT_ROWS)
    throw new Error(`${name}: máximo ${MAX_IMPORT_ROWS} filas por importación.`)
  return { name, headers, rows }
}

function readSpreadsheet(name: string, data: Uint8Array): GiftImportDataset[] {
  if (/\.csv$/i.test(name)) {
    const dataset = toDataset(name, parseCsv(decodeCsv(data)))
    return dataset ? [dataset] : []
  }
  const isZip = data[0] === 0x50 && data[1] === 0x4b
  const isLegacyExcel =
    data[0] === 0xd0 && data[1] === 0xcf && data[2] === 0x11 && data[3] === 0xe0
  if (!isZip && !isLegacyExcel)
    throw new Error(`${name} no es un archivo de Excel válido.`)
  // XLSX is itself a ZIP; cap its actual expanded size before the workbook reader.
  if (isZip) readZip(data, false)
  const workbook = read(data, {
    type: 'array',
    raw: true,
    dense: true,
    sheetRows: MAX_IMPORT_ROWS + 2,
    cellHTML: false,
    cellFormula: false,
  })
  if (workbook.SheetNames.length > MAX_DATASETS)
    throw new Error(`El libro puede contener hasta ${MAX_DATASETS} hojas.`)
  return workbook.SheetNames.flatMap(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    const range = utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1')
    if (range.e.c >= MAX_IMPORT_COLUMNS || range.e.r > MAX_IMPORT_ROWS)
      throw new Error(
        `${sheetName}: máximo ${MAX_IMPORT_ROWS} filas de datos y ${MAX_IMPORT_COLUMNS} columnas.`
      )
    const dataset = toDataset(
      `${name} · ${sheetName}`,
      utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: true,
        defval: '',
        blankrows: true,
        range: 0,
      })
    )
    return dataset ? [dataset] : []
  })
}

export function readGiftImportFile(
  name: string,
  data: Uint8Array
): GiftImportDataset[] {
  if (data.byteLength > MAX_IMPORT_FILE_BYTES)
    throw new Error('El archivo supera 10 MB.')
  if (!data.length) throw new Error('El archivo está vacío.')
  let datasets: GiftImportDataset[]
  if (/\.zip$/i.test(name)) {
    if (data[0] !== 0x50 || data[1] !== 0x4b)
      throw new Error('El archivo ZIP no es válido.')
    datasets = readZip(data, true).flatMap(file =>
      readSpreadsheet(file.name, file.data)
    )
  } else if (spreadsheetExtension.test(name))
    datasets = readSpreadsheet(name, data)
  else throw new Error('Elegí un archivo CSV, XLSX, XLS o ZIP.')
  if (!datasets.length)
    throw new Error('No se encontraron hojas con encabezados y filas de datos.')
  if (datasets.length > MAX_DATASETS)
    throw new Error(
      `Podés cargar hasta ${MAX_DATASETS} hojas o archivos por vez.`
    )
  return datasets
}
