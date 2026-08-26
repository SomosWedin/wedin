import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { IoGiftOutline } from 'react-icons/io5'
import { getCategories } from '@/actions/data/category'
import { getEvent } from '@/actions/data/event'
import { getGiftlist } from '@/actions/data/giftlist'
import { getWishlistGifts } from '@/actions/data/wishlist-gift'
import AddGiftlistToWishlistButton from '@/components/dashboard/add-giftlist-to-wishlist-button'
import GiftAddedBadge from '@/components/dashboard/gift-added-badge'
import GiftTypeBadge from '@/components/dashboard/gift-type-badge'

export default async function GiftlistDetailPage({
  params,
}: {
  params: { giftlistId: string }
}) {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return <div>Error</div>
  }

  const [giftlist, wishlistGifts, categories] = await Promise.all([
    getGiftlist(params.giftlistId),
    getWishlistGifts({ searchParams: { wishlistId: event.wishlistId } }),
    getCategories(event.eventType),
  ])

  if (!giftlist) {
    redirect('/gifts')
  }

  const categoryNameById = new Map(
    categories.map(category => [category.id, category.name])
  )
  const wishlistGiftIds = new Set(
    wishlistGifts
      .filter(wishlistGift => !wishlistGift.isReceived)
      .map(wishlistGift => wishlistGift.giftId)
  )
  const giftIds = giftlist.gifts.map(gift => gift.id)
  const allInWishlist =
    giftIds.length > 0 && giftIds.every(giftId => wishlistGiftIds.has(giftId))
  const totalPrice = giftlist.gifts.reduce(
    (sum, gift) => sum + Number(gift.price || 0),
    0
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/gifts"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2 gap-2 w-fit"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black">{giftlist.name}</h1>
            <p className="text-textTertiary mt-2">
              Productos: {giftlist.gifts.length} - En efectivo: Gs.{' '}
              {totalPrice.toLocaleString('es-PY')}
            </p>
          </div>
          <AddGiftlistToWishlistButton
            eventId={event.id}
            wishlistId={event.wishlistId}
            giftIds={giftIds}
            allInWishlist={allInWishlist}
          />
        </div>

        <div className="bg-white rounded-lg">
          <div className="grid grid-cols-1 gap-4">
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-t-lg text-sm font-medium text-gray-600">
              <div className="col-span-5">Nombre y categoría</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2">Precio</div>
              <div className="col-span-3">Estado</div>
            </div>

            {giftlist.gifts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Este paquete no tiene regalos
              </div>
            ) : (
              giftlist.gifts.map(gift => {
                const isInWishlist = wishlistGiftIds.has(gift.id)

                return (
                  <div
                    key={gift.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-4 px-4 py-4 border-b border-gray-100 hover:bg-gray-50 items-center"
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden shrink-0">
                        {gift.image?.url ? (
                          <Image
                            src={gift.image.url}
                            alt={gift.name}
                            className="w-full h-full object-cover"
                            width={48}
                            height={48}
                          />
                        ) : (
                          <IoGiftOutline className="text-2xl text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{gift.name}</p>
                        <p className="text-sm text-gray-500">
                          {categoryNameById.get(gift.categoryId) ??
                            'Sin categoría'}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <GiftTypeBadge isGroupGift={false} />
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm">
                        Gs.{Number(gift.price).toLocaleString('es-PY')}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <GiftAddedBadge isInWishlist={isInWishlist} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
