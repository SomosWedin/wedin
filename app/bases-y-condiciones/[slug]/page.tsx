import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TermsDocumentView from '@/components/terms/terms-document'
import { getTermsFileUrl } from '@/lib/server/terms-storage'
import { findTermsDocumentBySlug, TERMS_DOCUMENT_LIST } from '@/lib/terms'

type TermsPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return TERMS_DOCUMENT_LIST.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { slug } = await params
  const terms = findTermsDocumentBySlug(slug)

  if (!terms) return {}

  return {
    title: `${terms.title} — ${terms.audience} | Wedin`,
    description: terms.summary,
  }
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { slug } = await params
  const terms = findTermsDocumentBySlug(slug)

  if (!terms) notFound()

  return <TermsDocumentView terms={terms} fileUrl={getTermsFileUrl(terms)} />
}
