import type { Metadata } from 'next'
import TermsDocumentView from '@/components/terms/terms-document'
import { ORGANIZER_TERMS } from '@/lib/terms'

export const metadata: Metadata = {
  title: 'Bases y condiciones para novios y organizadores | Wedin',
}

export default function OrganizerTermsPage() {
  return <TermsDocumentView terms={ORGANIZER_TERMS} />
}
