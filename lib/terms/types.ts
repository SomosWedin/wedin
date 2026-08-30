export type TermsBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: [string, string]; rows: [string, string][] }

export type TermsSection = {
  heading: string
  blocks: TermsBlock[]
}

export type TermsDocument = {
  title: string
  audience: string
  version: string
  updatedAt: string
  effectiveFrom: string
  sections: TermsSection[]
}
