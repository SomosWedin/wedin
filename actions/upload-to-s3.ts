'use server'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getCurrentUser } from '@/actions/get-current-user'
import {
  ALLOWED_IMAGE_FORMATS_LABEL,
  isAllowedImageMimeType,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  sanitizeUploadFileName,
} from '@/lib/image-upload'

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
})

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i

type GetSignedURLParams = {
  fileName: string
  fileType: string
  fileSize: number
  checksum: string
}

export const getSignedURL = async ({
  fileName,
  fileType,
  fileSize,
  checksum,
}: GetSignedURLParams) => {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'No estás autenticado' }
  }

  if (!isAllowedImageMimeType(fileType)) {
    return {
      error: `Formato no admitido. Usa ${ALLOWED_IMAGE_FORMATS_LABEL}.`,
    }
  }

  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    return { error: 'Archivo inválido' }
  }

  if (fileSize > MAX_IMAGE_SIZE_BYTES) {
    return {
      error: `El archivo supera el máximo de ${MAX_IMAGE_SIZE_MB} MB`,
    }
  }

  if (!SHA256_HEX_PATTERN.test(checksum)) {
    return { error: 'Archivo inválido' }
  }

  const safeFileName = sanitizeUploadFileName(fileName, fileType)
  const fileKey = `uploads/${user.id}/${crypto.randomUUID()}-${safeFileName}`

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileKey,
    ContentType: fileType,
    ContentLength: fileSize,
    ChecksumSHA256: checksum,
    Metadata: {
      checksum,
      uploadedBy: user.id,
    },
  })

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60,
  })

  return { success: signedUrl }
}
