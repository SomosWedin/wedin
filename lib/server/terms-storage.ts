import 'server-only'

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { TermsDocument } from '@/lib/terms/documents'

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
})

export async function getTermsFileStream(document: TermsDocument) {
  const bucket = process.env.AWS_BUCKET

  if (!bucket) {
    console.error('Terms storage is not configured.')
    return null
  }

  try {
    const object = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: document.objectKey })
    )

    return object.Body?.transformToWebStream() ?? null
  } catch (error) {
    console.error(`Error reading terms file ${document.objectKey}:`, error)

    return null
  }
}
