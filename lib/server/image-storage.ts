import 'server-only'

import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
})

export function getOwnedStorageKey(imageUrl: string) {
  const bucket = process.env.AWS_BUCKET
  const region = process.env.AWS_BUCKET_REGION
  if (!bucket || !region) throw new Error('Image storage is not configured.')

  const url = new URL(imageUrl)
  const expectedHost = `${bucket}.s3.${region}.amazonaws.com`
  const key = decodeURIComponent(url.pathname.slice(1))

  // Database ownership is checked by the caller; the exact host check also
  // prevents a stored external URL from becoming an arbitrary S3 key.
  if (url.protocol !== 'https:' || url.hostname !== expectedHost || !key) {
    throw new Error('Invalid stored image URL.')
  }

  return key
}

export async function deleteStoredImageObject(imageUrl: string) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: getOwnedStorageKey(imageUrl),
    })
  )
}
