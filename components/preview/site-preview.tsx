'use client'

import type { Event, Image as ImageModel, User } from '@prisma/client'
import { useEffect, useState } from 'react'
import { IoGiftOutline } from 'react-icons/io5'
import EmptyState from '@/components/common/empty-state'
import type { WishlistGiftWithGift } from '@/components/guest/guest-gift-card'
import GuestGiftCatalog from '@/components/guest/guest-gift-catalog'
import GuestHero from '@/components/guest/guest-hero'
import { useCartStore } from '@/hooks/use-cart-store'
import {
  getPreviewCartKey,
  isSitePreviewDraftMessage,
  SITE_PREVIEW_READY,
  type SitePreviewDraft,
} from '@/lib/site-preview'

type SitePreviewProps = {
  event: Event & {
    images: ImageModel[]
    users: User[]
    eventType: { key: string } | null
  }
  wishlistGifts: WishlistGiftWithGift[]
}

export default function SitePreview({
  event,
  wishlistGifts,
}: SitePreviewProps) {
  const [draft, setDraft] = useState<SitePreviewDraft | null>(null)
  const previewCartStore = useCartStore(getPreviewCartKey(event.id))

  useEffect(() => {
    previewCartStore.getState().clear()
  }, [previewCartStore])

  useEffect(() => {
    const handleMessage = (message: MessageEvent) => {
      if (message.origin !== window.location.origin) return
      if (!isSitePreviewDraftMessage(message.data)) return

      setDraft(message.data.draft)
    }

    window.addEventListener('message', handleMessage)

    window.parent.postMessage(
      { type: SITE_PREVIEW_READY },
      window.location.origin
    )

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const previewEvent = {
    ...event,
    images: draft ? draft.images : event.images,
    coverMessage: draft ? draft.coverMessage : event.coverMessage,
  }

  return (
    <>
      <GuestHero event={previewEvent} />
      {wishlistGifts.length === 0 ? (
        <EmptyState
          icon={<IoGiftOutline className="text-4xl sm:text-6xl" />}
          title="Tu lista todavía no tiene regalos"
          description="Cuando agregues regalos en “Mi lista”, tus invitados los verán acá."
        />
      ) : (
        <GuestGiftCatalog eventId={event.id} wishlistGifts={wishlistGifts} />
      )}
    </>
  )
}
