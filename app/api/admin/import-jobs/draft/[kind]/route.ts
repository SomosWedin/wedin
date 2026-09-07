import {
  acceptAdminCollectionImport,
  getAdminCollectionImportReviewRows,
  reviewAdminCollectionImportJob,
  startAdminCollectionImportJob,
  uploadAdminCollectionImportRows,
} from '@/actions/data/collection-import'
import {
  acceptAdminGiftImport,
  getAdminImportReviewRows,
  reviewAdminImportJob,
  startAdminImportJob,
  uploadAdminImportRows,
} from '@/actions/data/import-job'

export async function POST(
  request: Request,
  { params }: { params: { kind: string } }
) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: 'Origen no autorizado.' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const { operation, input } = body as { operation?: unknown; input?: unknown }
  let result: unknown
  if (params.kind === 'gift') {
    if (operation === 'start') result = await startAdminImportJob(input)
    else if (operation === 'upload') result = await uploadAdminImportRows(input)
    else if (operation === 'review') result = await reviewAdminImportJob(input)
    else if (operation === 'reviewRows')
      result = await getAdminImportReviewRows(input)
    else if (operation === 'accept') result = await acceptAdminGiftImport(input)
  } else if (params.kind === 'collection') {
    if (operation === 'start')
      result = await startAdminCollectionImportJob(input)
    else if (operation === 'upload')
      result = await uploadAdminCollectionImportRows(input)
    else if (operation === 'review')
      result = await reviewAdminCollectionImportJob(input)
    else if (operation === 'reviewRows')
      result = await getAdminCollectionImportReviewRows(input)
    else if (operation === 'accept')
      result = await acceptAdminCollectionImport(input)
  }
  if (!result)
    return Response.json({ error: 'Operación inválida.' }, { status: 400 })
  return Response.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
