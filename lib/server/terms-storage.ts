import 'server-only'

import type { TermsDocument } from '@/lib/terms/documents'

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
