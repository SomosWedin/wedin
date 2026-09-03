import { getTermsFileStream } from '@/lib/server/terms-storage'
import { findTermsDocumentBySlug } from '@/lib/terms'

type TermsPdfRouteContext = {
  params: { slug: string }
}

export async function GET(_request: Request, { params }: TermsPdfRouteContext) {
  const terms = findTermsDocumentBySlug(params.slug)

  if (!terms) {
    return new Response('No encontrado', { status: 404 })
  }

  const body = await getTermsFileStream(terms)

  if (!body) {
    return new Response('Documento no disponible', { status: 502 })
  }

  const fileName = terms.objectKey.split('/').pop() ?? `${terms.slug}.pdf`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
