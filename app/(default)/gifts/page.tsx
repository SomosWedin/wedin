import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { getCategories } from '@/actions/data/category'
import { getEvent } from '@/actions/data/event'
import { getGifts } from '@/actions/data/gift'
import { getGiftlists } from '@/actions/data/giftlist'
import { getWishlistGifts } from '@/actions/data/wishlist-gift'
import GiftsCatalogSection from '@/components/dashboard/gifts-catalog-section'
import CreateGiftDialog from '@/components/dialog/create-gift-dialog'

export default async function GiftsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return <div>Error</div>
  }

  const [gifts, giftlists, wishlistGifts, categories] = await Promise.all([
    getGifts({ searchParams, eventType: event.eventType }),
    getGiftlists({ searchParams, eventType: event.eventType }),
    getWishlistGifts({ searchParams: { wishlistId: event.wishlistId } }),
    getCategories(event.eventType),
  ])

  const wishlistGiftIds = new Set(
    wishlistGifts
      .filter(wishlistGift => !wishlistGift.isReceived)
      .map(wishlistGift => wishlistGift.giftId)
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-4">
          <div>
            <Link
              href="/wishlist"
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2 gap-2 w-fit"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Link>
            <h1 className="text-3xl font-black">Agregar regalos</h1>
            <p className="text-textTertiary mt-2">
              Explorá los regalos disponibles y agregalos a tu lista, o creá los
              tuyos propios.
            </p>
          </div>
          <CreateGiftDialog
            eventId={event.id}
            wishlistId={event.wishlistId}
            categories={categories}
          />
        </div>

        <GiftsCatalogSection
          gifts={gifts}
          giftlists={giftlists}
          categories={categories}
          eventId={event.id}
          wishlistId={event.wishlistId}
          wishlistGiftIds={wishlistGiftIds}
        />
      </div>
    </div>
  )
}
