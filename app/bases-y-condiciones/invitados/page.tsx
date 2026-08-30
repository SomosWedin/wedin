import type { Metadata } from 'next'
import TermsDocumentView from '@/components/terms/terms-document'
import { GUEST_TERMS } from '@/lib/terms'

export const metadata: Metadata = {
  title: 'Bases y condiciones para invitados | Wedin',
}

export default function GuestTermsPage() {
  return <TermsDocumentView terms={GUEST_TERMS} />
}
