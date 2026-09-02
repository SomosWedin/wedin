export function hasAcceptedOrganizerTerms(event: {
  termsAcceptedAt: Date | null
  isPublished: boolean
}) {
  return event.termsAcceptedAt !== null || event.isPublished
}

export type { TermsDocument } from './documents'
export {
  findTermsDocumentBySlug,
  TERMS_DOCUMENT_LIST,
  TERMS_DOCUMENTS,
  TERMS_PATHS,
} from './documents'
