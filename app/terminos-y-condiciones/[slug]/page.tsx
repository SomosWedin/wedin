import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TermsDocumentView from '@/components/terms/terms-document'
import {
  findTermsDocumentBySlug,
  getTermsPdfPath,
  TERMS_DOCUMENT_LIST,
} from '@/lib/terms'

type TermsPageProps = {
  params: { slug: string }
}

export function generateStaticParams() {
  return TERMS_DOCUMENT_LIST.map(({ slug }) => ({ slug }))
}

export function generateMetadata({ params }: TermsPageProps): Metadata {
  const terms = findTermsDocumentBySlug(params.slug)

  if (!terms) return {}

  return {
    title: `${terms.title} — ${terms.audience} | Wedin`,
    description: terms.summary,
  }
}

export default function TermsPage({ params }: TermsPageProps) {
  const terms = findTermsDocumentBySlug(params.slug)

  if (!terms) notFound()

  return <TermsDocumentView terms={terms} fileUrl={getTermsPdfPath(terms)} />
}
