export function hasAcceptedOrganizerTerms(event: {
  termsAcceptedAt?: Date | null
}) {
  // `!= null` so a narrowed select or a JSON round-trip that drops the field
  // fails closed rather than reading as accepted.
  return event.termsAcceptedAt != null
}

export type { TermsDocument } from './documents'
export {
  findTermsDocumentBySlug,
  TERMS_BASE_PATH,
  TERMS_DOCUMENT_LIST,
  TERMS_DOCUMENTS,
  TERMS_PATHS,
} from './documents'
