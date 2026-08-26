import { getSignedURL } from '@/actions/upload-to-s3'
import { computeSHA256 } from './utils'

type UploadResult =
  | { url: string; error?: never }
  | { url?: never; error: string }

const uploadImageToAws = async (file: File): Promise<UploadResult> => {
  const checksum = await computeSHA256(file)

  const presignResponse = await getSignedURL({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    checksum,
  })

  if (!presignResponse.success) {
    return {
      error: presignResponse.error ?? 'No se pudo generar la URL de subida',
    }
  }

  const uploadResponse = await fetch(presignResponse.success, {
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
    url: presignResponse.success.split('?')[0],
  }
}

type UploadImagesToAwsParams = {
  files: File[]
}

export const uploadEventCoverImagesToAws = async ({
  files,
}: UploadImagesToAwsParams) => {
  const uploadedImages: string[] = []

  for (const file of files) {
    const result = await uploadImageToAws(file)

    if (result.error) {
      return { error: result.error }
    }

    if (!result.url) {
      return { error: result.error }
    }

    uploadedImages.push(result.url)
  }

  return { uploadedImages }
}

export const uploadGiftImageToAws = async ({ file }: { file: File }) => {
  return uploadImageToAws(file)
}
