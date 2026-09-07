import { getAdminImportJobDetails } from '@/actions/data/import-job'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const searchParams = new URL(request.url).searchParams
  const result = await getAdminImportJobDetails({
    jobId: params.id,
    page: Number(searchParams.get('page') || 0),
    historyPage: Number(searchParams.get('historyPage') || 0),
  })

  return Response.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
