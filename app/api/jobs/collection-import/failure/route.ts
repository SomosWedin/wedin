import { recordImportDeliveryFailure } from '@/actions/data/import-job-worker'
import { verifyImportSignature } from '@/lib/server/import-queue'
import { ImportMessageSchema } from '@/schemas/import-job'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  if (
    !(await verifyImportSignature(
      request,
      body,
      '/api/jobs/collection-import/failure'
    ))
  )
    return new Response('Unauthorized', { status: 401 })
  let message: ReturnType<typeof ImportMessageSchema.parse>
  try {
    message = ImportMessageSchema.parse(
      JSON.parse(
        Buffer.from(JSON.parse(body).sourceBody, 'base64').toString('utf8')
      )
    )
  } catch {
    return new Response('Invalid message', { status: 400 })
  }
  try {
    await recordImportDeliveryFailure(message.jobId, message.runId)
    return Response.json({ ok: true })
  } catch {
    return new Response('Import temporarily unavailable', { status: 503 })
  }
}
