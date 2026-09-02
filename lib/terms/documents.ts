export type TermsAudienceKey = 'organizers' | 'guests' | 'privacy'

export type TermsDocument = {
  key: TermsAudienceKey
  slug: string
  objectKey: string
  title: string
  audience: string
  summary: string
}

const documents = {
  organizers: {
    key: 'organizers',
    slug: 'organizadores',
    objectKey: 'terms/wedin-terminos-organizadores.pdf',
    title: 'Términos y Condiciones de Uso',
    audience: 'Novios y organizadores',
    summary: 'Condiciones que aceptás al activar tu lista de regalos en wedin.',
  },
  guests: {
    key: 'guests',
    slug: 'invitados',
    objectKey: 'terms/wedin-terminos-invitados.pdf',
    title: 'Términos y Condiciones de Uso',
    audience: 'Invitados',
    summary: 'Condiciones que aceptás al confirmar una compra en wedin.',
  },
  privacy: {
    key: 'privacy',
    slug: 'politica-de-privacidad',
    objectKey: 'terms/wedin-politica-de-privacidad.pdf',
    title: 'Política de Privacidad',
    audience: 'Todos los usuarios',
    summary: 'Cómo wedin trata los datos personales que recibe.',
  },
} satisfies Record<TermsAudienceKey, TermsDocument>

export const TERMS_DOCUMENTS: Record<TermsAudienceKey, TermsDocument> =
  documents

export const TERMS_DOCUMENT_LIST: TermsDocument[] = Object.values(documents)

export const TERMS_BASE_PATH = '/terminos-y-condiciones'

function getTermsPath(key: TermsAudienceKey) {
  return `${TERMS_BASE_PATH}/${documents[key].slug}`
}

export const TERMS_PATHS = {
  organizers: getTermsPath('organizers'),
  guests: getTermsPath('guests'),
  privacy: getTermsPath('privacy'),
} as const

export function findTermsDocumentBySlug(slug: string) {
  return TERMS_DOCUMENT_LIST.find(document => document.slug === slug) ?? null
}
