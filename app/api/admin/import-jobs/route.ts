import { getAdminImportJobs } from '@/actions/data/import-job'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const result = await getAdminImportJobs({
    page: Number(searchParams.get('page') || 0),
    search: searchParams.get('search') || '',
    ...(searchParams.get('status')
      ? { status: searchParams.get('status') }
      : {}),
    ...(searchParams.get('kind') ? { kind: searchParams.get('kind') } : {}),
  })

  return Response.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
