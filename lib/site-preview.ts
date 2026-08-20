export const SITE_PREVIEW_PATH = '/preview'

export const SITE_PREVIEW_READY = 'wedin:site-preview-ready'
export const SITE_PREVIEW_DRAFT = 'wedin:site-preview-draft'

// Anything a guest would add to the cart while the organizer clicks around
// the preview is throwaway, so it never shares a store with a real visit.
export function getPreviewCartKey(eventId: string) {
  return `${eventId}-preview`
}

export type SitePreviewImage = {
  id: string
  url: string | null
}

export type SitePreviewDraft = {
  coverMessage: string
  images: SitePreviewImage[]
}

export type SitePreviewReadyMessage = {
  type: typeof SITE_PREVIEW_READY
}

export type SitePreviewDraftMessage = {
  type: typeof SITE_PREVIEW_DRAFT
  draft: SitePreviewDraft
}

export function isSitePreviewReadyMessage(
  data: unknown
): data is SitePreviewReadyMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as SitePreviewReadyMessage).type === SITE_PREVIEW_READY
  )
}

export function isSitePreviewDraftMessage(
  data: unknown
): data is SitePreviewDraftMessage {
  if (typeof data !== 'object' || data === null) return false

  const message = data as SitePreviewDraftMessage

  return (
    message.type === SITE_PREVIEW_DRAFT &&
    typeof message.draft?.coverMessage === 'string' &&
    Array.isArray(message.draft?.images)
  )
}
