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
import prismaClient from '@/prisma/client'

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
})

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i

type GetSignedURLParams = {
  fileName: string
  fileType: string
  fileSize: number
  id: string
  type: 'giftId' | 'eventId'
  checksum: string
}

async function userOwnsUploadTarget(
  userId: string,
  id: string,
  type: GetSignedURLParams['type']
) {
  if (type === 'giftId') {
    const gift = await prismaClient.gift.findFirst({
      where: { id, event: { users: { some: { id: userId } } } },
      select: { id: true },
    })

    return Boolean(gift)
  }

  const event = await prismaClient.event.findFirst({
    where: { id, users: { some: { id: userId } } },
    select: { id: true },
  })

  return Boolean(event)
}

export const getSignedURL = async ({
  fileName,
  fileType,
  fileSize,
  id,
  type,
  checksum,
}: GetSignedURLParams) => {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'No estas autenticado' }
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
    return { error: `El archivo supera el máximo de ${MAX_IMAGE_SIZE_MB} MB` }
  }

  if (!SHA256_HEX_PATTERN.test(checksum)) {
    return { error: 'Archivo inválido' }
  }

  if (!OBJECT_ID_PATTERN.test(id)) {
    return { error: 'Identificador inválido' }
  }

  if (!(await userOwnsUploadTarget(user.id, id, type))) {
    return { error: 'No tienes permiso para subir imágenes aquí' }
  }

  const metadata: { [key: string]: string } = { checksum }

  if (type === 'giftId') {
    metadata.giftId = id
  }

  if (type === 'eventId') {
    metadata.eventId = id
  }

  const safeFileName = sanitizeUploadFileName(fileName, fileType)
  const fileKey = `${id}/${Date.now()}-${safeFileName}`

  const putObjectCommand = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileKey,
    ContentType: fileType,
    ContentLength: fileSize,
    ChecksumSHA256: checksum,
    Metadata: metadata,
  })

  const signedUrl = await getSignedUrl(s3Client, putObjectCommand, {
    expiresIn: 60,
  })

  return { success: signedUrl }
}
