export function hasAcceptedOrganizerTerms(event: {
  termsAcceptedAt: Date | null
  isPublished: boolean
}) {
  return event.termsAcceptedAt !== null || event.isPublished
}

export type { TermsAudienceKey, TermsDocument } from './documents'
export {
  findTermsDocumentBySlug,
  getTermsPath,
  TERMS_BASE_PATH,
  TERMS_DOCUMENT_LIST,
  TERMS_DOCUMENTS,
  TERMS_PATHS,
} from './documents'
