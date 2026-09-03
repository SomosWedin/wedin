import 'server-only'

import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
})

type StorageOwnership = {
  userId: string
  eventId: string
}

type StoredImageReference = StorageOwnership & {
  imageUrl: string
}

export function getOwnedStorageKey(
  imageUrl: string,
  { userId, eventId }: StorageOwnership
) {
  const bucket = process.env.AWS_BUCKET
  const region = process.env.AWS_BUCKET_REGION
  if (!bucket || !region) throw new Error('Image storage is not configured.')

  const url = new URL(imageUrl)
  const expectedHost = `${bucket}.s3.${region}.amazonaws.com`
  const key = decodeURIComponent(url.pathname.slice(1))

  if (url.protocol !== 'https:' || url.hostname !== expectedHost || !key) {
    throw new Error('Invalid stored image URL.')
  }

  const currentUserPrefix = `uploads/${userId}/`
  const legacyEventPrefix = `${eventId}/`

  // Current uploads are scoped by user. Event covers created by the previous
  // uploader used `{eventId}/...`, so that legacy format remains deletable only
  // when the caller has already proven ownership of that exact event.
  const ownsCurrentKey =
    key.startsWith(currentUserPrefix) && key.length > currentUserPrefix.length
  const ownsLegacyKey =
    key.startsWith(legacyEventPrefix) && key.length > legacyEventPrefix.length

  if (!ownsCurrentKey && !ownsLegacyKey) {
    throw new Error('Stored image does not belong to this user or event.')
  }

  return key
}

export async function deleteStoredImageObjects(images: StoredImageReference[]) {
  // Validate the complete batch before deleting its first object.
  const keys = images.map(({ imageUrl, userId, eventId }) =>
    getOwnedStorageKey(imageUrl, { userId, eventId })
  )

  for (const key of keys) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
      })
    )
  }
}
