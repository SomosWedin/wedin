import { createImageUploadUrl } from '@/actions/image-storage'
import { computeSHA256 } from './utils'

type UploadResult =
  | { url: string; error?: never }
  | { url?: never; error: string }

export const uploadImage = async (file: File): Promise<UploadResult> => {
  const checksum = await computeSHA256(file)

  const uploadUrlResponse = await createImageUploadUrl({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    checksum,
  })

  if (!uploadUrlResponse.uploadUrl) {
    return {
      error: uploadUrlResponse.error ?? 'No se pudo generar la URL de subida',
    }
  }

  const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (!uploadResponse.ok) {
    return {
      error: uploadResponse.statusText || 'No se pudo subir la imagen',
    }
  }

  return {
    url: uploadUrlResponse.uploadUrl.split('?')[0],
  }
}

export const uploadImages = async (files: File[]) => {
  const imageUrls: string[] = []

  for (const file of files) {
    const result = await uploadImage(file)

    if (result.error) {
      return { error: result.error }
    }

    if (!result.url) {
      return { error: result.error }
    }

    imageUrls.push(result.url)
  }

  return { imageUrls }
}
