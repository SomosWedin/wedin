export function hasAcceptedOrganizerTerms(event: {
  termsAcceptedAt?: Date | null
}) {
  return event.termsAcceptedAt != null
}

export type { TermsDocument } from './documents'
export {
  findTermsDocumentBySlug,
  getTermsPdfPath,
  TERMS_BASE_PATH,
  TERMS_DOCUMENT_LIST,
  TERMS_DOCUMENTS,
  TERMS_PATHS,
} from './documents'
