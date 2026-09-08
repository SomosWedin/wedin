import { getEvent } from '@/actions/data/event'
import { getPublicWishlistGifts } from '@/actions/data/public-event'
import { hasGift } from '@/components/guest/guest-gift-card'
import SitePreview from '@/components/preview/site-preview'

export const dynamic = 'force-dynamic'

export default async function SitePreviewPage() {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return (
      <div className="flex justify-center items-center px-6 py-24 text-center text-gray-500">
        No pudimos cargar la vista previa de tu sitio.
      </div>
    )
  }

  const wishlistGifts = (await getPublicWishlistGifts(event.id)).filter(hasGift)

  return <SitePreview event={event} wishlistGifts={wishlistGifts} />
}
