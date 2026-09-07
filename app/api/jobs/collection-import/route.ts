import { processCollectionImportJob } from '@/actions/data/collection-import-worker'
import { verifyImportSignature } from '@/lib/server/import-queue'
import { ImportMessageSchema } from '@/schemas/import-job'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const body = await request.text()
  if (
    !(await verifyImportSignature(request, body, '/api/jobs/collection-import'))
  )
    return new Response('Unauthorized', { status: 401 })
  let message: ReturnType<typeof ImportMessageSchema.parse>
  try {
    message = ImportMessageSchema.parse(JSON.parse(body))
  } catch {
    return new Response('Invalid message', { status: 400 })
  }
  try {
    const attempt = Number(request.headers.get('upstash-retried') || 0)
    await processCollectionImportJob(
      message.jobId,
      message.runId,
      Number.isFinite(attempt) ? attempt : 0
    )
    return Response.json({ ok: true })
  } catch {
    return new Response('Import temporarily unavailable', { status: 503 })
  }
}
