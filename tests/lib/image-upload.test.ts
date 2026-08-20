import { describe, expect, it } from 'vitest'

import {
  isAllowedImageMimeType,
  MAX_IMAGE_SIZE_BYTES,
  resolveImageMimeType,
  sanitizeUploadFileName,
  validateImageFile,
} from '@/lib/image-upload'

function makeFile({
  name,
  type,
  size = 1024,
}: {
  name: string
  type: string
  size?: number
}) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('sanitizeUploadFileName', () => {
  it('drops path segments so the S3 key cannot escape its prefix', () => {
    expect(sanitizeUploadFileName('../../evil/payload.jpg', 'image/jpeg')).toBe(
      'payload.jpg'
    )
    expect(sanitizeUploadFileName('C:\\Users\\a\\foto.png', 'image/png')).toBe(
      'foto.png'
    )
  })

  it('forces the extension to match the validated content type', () => {
    expect(sanitizeUploadFileName('foto.jpg.html', 'image/jpeg')).toBe(
      'foto-jpg.jpg'
    )
    expect(sanitizeUploadFileName('logo.svg', 'image/png')).toBe('logo.png')
  })

  it('strips characters outside the ascii-safe set', () => {
    expect(sanitizeUploadFileName('Añó Nüevo 2026!.jpg', 'image/jpeg')).toBe(
      'ano-nuevo-2026.jpg'
    )
    expect(sanitizeUploadFileName('foto\n<script>.png', 'image/png')).toBe(
      'foto-script.png'
    )
  })

  it('falls back to a default name when nothing usable is left', () => {
    expect(sanitizeUploadFileName('....jpg', 'image/jpeg')).toBe('imagen.jpg')
    expect(sanitizeUploadFileName('', 'image/webp')).toBe('imagen.webp')
  })

  it('caps the length of the resulting name', () => {
    const name = sanitizeUploadFileName(`${'a'.repeat(300)}.jpg`, 'image/jpeg')
    expect(name).toBe(`${'a'.repeat(60)}.jpg`)
  })
})

describe('resolveImageMimeType', () => {
  it('accepts the formats the app supports', () => {
    expect(resolveImageMimeType({ name: 'a.jpg', type: 'image/jpeg' })).toBe(
      'image/jpeg'
    )
    expect(resolveImageMimeType({ name: 'a.heic', type: 'image/heic' })).toBe(
      'image/heic'
    )
  })

  it('falls back to the extension when the browser reports no type', () => {
    expect(resolveImageMimeType({ name: 'IMG_0042.HEIC', type: '' })).toBe(
      'image/heic'
    )
    expect(
      resolveImageMimeType({
        name: 'IMG_0042.heif',
        type: 'application/octet-stream',
      })
    ).toBe('image/heif')
  })

  it('rejects formats that are not real photos', () => {
    expect(resolveImageMimeType({ name: 'a.svg', type: 'image/svg+xml' })).toBe(
      null
    )
    expect(resolveImageMimeType({ name: 'a.gif', type: 'image/gif' })).toBe(
      null
    )
    expect(resolveImageMimeType({ name: 'a.exe', type: '' })).toBe(null)
  })

  it('does not let a spoofed extension override a rejected type', () => {
    expect(
      resolveImageMimeType({ name: 'payload.jpg', type: 'text/html' })
    ).toBe(null)
  })

  it('ignores mime type parameters and casing', () => {
    expect(
      resolveImageMimeType({ name: 'a.jpg', type: 'IMAGE/JPEG; charset=utf-8' })
    ).toBe('image/jpeg')
  })
})

describe('validateImageFile', () => {
  it('accepts a supported image', () => {
    const result = validateImageFile(
      makeFile({ name: 'foto.jpg', type: 'image/jpeg' })
    )

    expect(result).toEqual({ ok: true, mimeType: 'image/jpeg' })
  })

  it('explains why an unsupported format was rejected', () => {
    const result = validateImageFile(
      makeFile({ name: 'foto.gif', type: 'image/gif' })
    )

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain(
      'no es un formato admitido'
    )
  })

  it('explains how heavy a rejected file is', () => {
    const result = validateImageFile(
      makeFile({
        name: 'foto.jpg',
        type: 'image/jpeg',
        size: MAX_IMAGE_SIZE_BYTES + 1,
      })
    )

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain('10.0 MB')
  })

  it('rejects empty files', () => {
    const result = validateImageFile(
      makeFile({ name: 'foto.jpg', type: 'image/jpeg', size: 0 })
    )

    expect(result.ok).toBe(false)
  })
})

describe('isAllowedImageMimeType', () => {
  it('is not fooled by inherited object properties', () => {
    expect(isAllowedImageMimeType('toString')).toBe(false)
    expect(isAllowedImageMimeType('constructor')).toBe(false)
  })
})
