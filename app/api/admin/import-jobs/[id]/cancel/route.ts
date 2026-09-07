import { cancelAdminImportJob } from '@/actions/data/import-job'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: 'Origen no autorizado.' }, { status: 403 })

  return Response.json(await cancelAdminImportJob(params.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
