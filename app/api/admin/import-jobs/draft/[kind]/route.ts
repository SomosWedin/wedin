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

const handlers: Record<
  string,
  Record<string, (input: unknown) => Promise<unknown>>
> = {
  gift: {
    start: startAdminImportJob,
    upload: uploadAdminImportRows,
    review: reviewAdminImportJob,
    reviewRows: getAdminImportReviewRows,
    accept: acceptAdminGiftImport,
  },
  collection: {
    start: startAdminCollectionImportJob,
    upload: uploadAdminCollectionImportRows,
    review: reviewAdminCollectionImportJob,
    reviewRows: getAdminCollectionImportReviewRows,
    accept: acceptAdminCollectionImport,
  },
}

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
  const handler =
    typeof operation === 'string'
      ? handlers[params.kind]?.[operation]
      : undefined
  if (!handler)
    return Response.json({ error: 'Operación inválida.' }, { status: 400 })
  return Response.json(await handler(input), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
