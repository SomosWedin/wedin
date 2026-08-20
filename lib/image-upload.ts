export const MAX_IMAGE_SIZE_MB = 10
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

export const ALLOWED_IMAGE_FORMATS_LABEL = 'JPG, PNG, WEBP o HEIC'

const EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
} as const

export type AllowedImageMimeType = keyof typeof EXTENSION_BY_MIME_TYPE

const MIME_TYPE_BY_EXTENSION: Record<string, AllowedImageMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(
  EXTENSION_BY_MIME_TYPE
) as AllowedImageMimeType[]

export const IMAGE_UPLOAD_ACCEPT = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...Object.keys(MIME_TYPE_BY_EXTENSION).map(extension => `.${extension}`),
].join(',')

const HEIC_MIME_TYPES: AllowedImageMimeType[] = ['image/heic', 'image/heif']

const MAX_CONVERTED_DIMENSION = 2400

const HEIC_DECODE_TIMEOUT_MS = 45000

export function isAllowedImageMimeType(
  value: string
): value is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.includes(value as AllowedImageMimeType)
}

function getFileExtension(fileName: string) {
  const base = fileName.split(/[\\/]/).pop() ?? ''
  const lastDot = base.lastIndexOf('.')
  return lastDot === -1 ? '' : base.slice(lastDot + 1).toLowerCase()
}

export function resolveImageMimeType(file: {
  name: string
  type: string
}): AllowedImageMimeType | null {
  const declaredType = (file.type.split(';')[0] ?? '').trim().toLowerCase()

  if (isAllowedImageMimeType(declaredType)) {
    return declaredType
  }

  // Chrome on Windows and several Android pickers hand HEIC/HEIF files over
  // with an empty or generic type, so fall back to the extension.
  if (declaredType === '' || declaredType === 'application/octet-stream') {
    return MIME_TYPE_BY_EXTENSION[getFileExtension(file.name)] ?? null
  }

  return null
}

export function sanitizeUploadFileName(
  fileName: string,
  mimeType: AllowedImageMimeType
) {
  const base = fileName.split(/[\\/]/).pop() ?? ''
  const lastDot = base.lastIndexOf('.')
  const stem = lastDot === -1 ? base : base.slice(0, lastDot)
  const slug = stem
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return `${slug || 'imagen'}.${EXTENSION_BY_MIME_TYPE[mimeType]}`
}

export function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024)

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export type ImageValidationResult =
  | { ok: true; mimeType: AllowedImageMimeType }
  | { ok: false; message: string }

export function validateImageFile(file: File): ImageValidationResult {
  const mimeType = resolveImageMimeType(file)

  if (!mimeType) {
    return {
      ok: false,
      message: `no es un formato admitido. Usa ${ALLOWED_IMAGE_FORMATS_LABEL}.`,
    }
  }

  if (file.size === 0) {
    return { ok: false, message: 'está vacío o no se pudo leer.' }
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      message: `pesa ${formatFileSize(file.size)} y el máximo es ${MAX_IMAGE_SIZE_MB} MB.`,
    }
  }

  return { ok: true, mimeType }
}

export function isHeicImage(mimeType: AllowedImageMimeType) {
  return HEIC_MIME_TYPES.includes(mimeType)
}

async function decodeNatively(file: File) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return await createImageBitmap(file)
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('HEIC decoding timed out')), ms)
    }),
  ])
}

async function decodeHeic(file: File) {
  // Safari decodes HEIC natively, so only browsers that cannot (Chrome,
  // Firefox) pay for downloading the libheif wasm bundle.
  try {
    return await decodeNatively(file)
  } catch {
    const { heicTo } = await import('heic-to')
    return await withTimeout(
      heicTo({ blob: file, type: 'bitmap' }),
      HEIC_DECODE_TIMEOUT_MS
    )
  }
}

export type PreparedImage =
  | { ok: true; file: File }
  | { ok: false; message: string }

export async function prepareImageForUpload(
  file: File
): Promise<PreparedImage> {
  const validation = validateImageFile(file)

  if (!validation.ok) {
    return validation
  }

  if (!isHeicImage(validation.mimeType)) {
    return { ok: true, file }
  }

  try {
    return { ok: true, file: await convertHeicToJpeg(file) }
  } catch (error) {
    console.error('HEIC conversion failed', file.name, error)
    return {
      ok: false,
      message:
        'no pudimos convertir esta foto. Vuelve a intentarlo o súbela en formato JPG.',
    }
  }
}

export async function convertHeicToJpeg(file: File) {
  const bitmap = await decodeHeic(file)
  const scale = Math.min(
    1,
    MAX_CONVERTED_DIMENSION / Math.max(bitmap.width, bitmap.height)
  )

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')

  if (!context) {
    bitmap.close()
    throw new Error('No se pudo procesar la imagen HEIC')
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  })

  if (!blob) {
    throw new Error('No se pudo procesar la imagen HEIC')
  }

  return new File([blob], sanitizeUploadFileName(file.name, 'image/jpeg'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  })
}
