import Link from 'next/link'
import { lazy, Suspense } from 'react'
import { IoAdd, IoGiftOutline } from 'react-icons/io5'
import { getCategories } from '@/actions/data/category'
import { getEvent } from '@/actions/data/event'
import { getWishlistGifts } from '@/actions/data/wishlist-gift'
import EmptyState from '@/components/common/empty-state'
import DashboardWishlistSkeleton from '@/components/skeletons/dashboard-wishlist'
import { Button } from '@/components/ui/button'

const DashboardWishlistList = lazy(
  () => import('@/components/dashboard/dashboard-wishlist-list')
)

export default async function DashboardWishlist() {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return <div>Error</div>
  }

  const [wishlistGifts, categories] = await Promise.all([
    getWishlistGifts({ searchParams: { wishlistId: event.wishlistId } }),
    getCategories(event.eventTypeId),
  ])

  return (
    <div className="w-full h-full flex items-center flex-col gap-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Mi lista de regalos</h1>
          <p className="text-textTertiary">
            Crea tu lista de regalos: elige lo que te gustaría recibir y
            organiza tus opciones para tus invitados.
          </p>
        </div>
        <Link href="/gifts">
          <Button variant="success" className="gap-2">
            Agregar regalo
            <IoAdd className="text-2xl" />
          </Button>
        </Link>
      </div>

      {wishlistGifts.length === 0 ? (
        <EmptyState
          icon={<IoGiftOutline className="text-4xl sm:text-6xl" />}
          title="Sin regalos en tu lista"
          description="Todavía no tienes ningún regalo agregado, explorá la sección de regalos."
          action={
            <Link href="/gifts">
              <Button
                variant="outline"
                className="gap-2 hover:bg-gray-100 transition-colors"
              >
                Agregar regalos
              </Button>
            </Link>
          }
        />
      ) : (
        <Suspense fallback={<DashboardWishlistSkeleton />}>
          <DashboardWishlistList
            eventId={event.id}
            wishlistId={event.wishlistId}
            wishlistGifts={wishlistGifts}
            categories={categories}
          />
        </Suspense>
      )}
    </div>
  )
}
