import 'server-only'

import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { TermsDocument } from '@/lib/terms/documents'

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
})

export function getTermsFileUrl(document: TermsDocument) {
  const bucket = process.env.AWS_BUCKET
  const region = process.env.AWS_BUCKET_REGION

  if (!bucket || !region) {
    throw new Error('Terms storage is not configured.')
  }

  const encodedKey = document.objectKey
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`
}

/**
 * The stored `termsVersion` is the object's ETag: a fingerprint of the exact
 * bytes the user accepted. Replacing the PDF in S3 changes it, so a consent
 * record keeps pointing at the document that was actually shown.
 */
export async function getTermsFileVersion(
  document: TermsDocument
): Promise<string | null> {
  try {
    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: document.objectKey,
      })
    )

    return head.ETag?.replaceAll('"', '') ?? null
  } catch (error) {
    // An unreachable object must not block an activation the user asked for.
    console.error(
      `Error reading terms version for ${document.objectKey}:`,
      error
    )

    return null
  }
}
