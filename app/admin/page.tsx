import Link from 'next/link'
import { redirect } from 'next/navigation'
import { lazy, Suspense } from 'react'
import {
  IoCalendarOutline,
  IoCashOutline,
  IoFolderOpenOutline,
  IoGiftOutline,
  IoPeopleOutline,
  IoPricetagOutline,
  IoSwapHorizontalOutline,
} from 'react-icons/io5'
import { getCategories } from '@/actions/data/category'
import { getAllEventsForAdmin } from '@/actions/data/event'
import { getEventTypes } from '@/actions/data/event-type'
import { getGifts } from '@/actions/data/gift'
import {
  getAdminGiftlists,
  getGiftlistOptionsForAdmin,
} from '@/actions/data/giftlist'
import { getAllPayoutsForAdmin } from '@/actions/data/payout'
import { getAllTransactionsForAdmin } from '@/actions/data/transaction'
import { getCurrentUser } from '@/actions/get-current-user'
import EmptyState from '@/components/common/empty-state'
import DashboardTransactionsSkeleton from '@/components/skeletons/dashboard-transactions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const AdminTransactionsList = lazy(
  () => import('@/components/admin/admin-transactions-list')
)
const AdminPayoutsList = lazy(
  () => import('@/components/admin/admin-payouts-list')
)
const AdminGiftsList = lazy(() => import('@/components/admin/admin-gifts-list'))
const AdminCategoriesList = lazy(
  () => import('@/components/admin/admin-categories-list')
)
const AdminGiftlistsList = lazy(
  () => import('@/components/admin/admin-giftlists-list')
)
const AdminEventTypesList = lazy(
  () => import('@/components/admin/admin-event-types-list')
)
const AdminEventsList = lazy(
  () => import('@/components/admin/admin-events-list')
)

export default async function AdminPage() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [
    transactions,
    payouts,
    events,
    gifts,
    categories,
    giftlists,
    adminGiftlists,
    eventTypes,
  ] = await Promise.all([
    getAllTransactionsForAdmin(),
    getAllPayoutsForAdmin(),
    getAllEventsForAdmin(),
    getGifts({ searchParams: { isDefault: true } }),
    getCategories(),
    getGiftlistOptionsForAdmin(),
    getAdminGiftlists(),
    getEventTypes(),
  ])

  return (
    <div className="container w-full h-full flex items-center flex-col gap-6 p-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black">Panel de staff</h1>
          <Link href="/admin/jobs" className="text-sm underline">
            Trabajos de importación
          </Link>
          <p className="text-textTertiary">
            Consultá todos los eventos, transacciones y solicitudes de retiro.
            Los cambios de estado quedan registrados con tu usuario.
          </p>
        </div>
      </div>

      <Tabs defaultValue="transacciones" className="w-full">
        <TabsList className="h-auto min-h-10 max-w-full justify-start gap-2 overflow-x-auto overflow-y-hidden sm:gap-3 sm:justify-center">
          <TabsTrigger
            value="transacciones"
            className="shrink-0 gap-2 text-xs sm:text-sm"
          >
            <IoSwapHorizontalOutline className="text-lg" />
            Transacciones
          </TabsTrigger>
          <TabsTrigger
            value="retiros"
            className="shrink-0 gap-2 text-xs sm:text-sm"
          >
            <IoCashOutline className="text-lg" />
            Solicitudes de retiro
          </TabsTrigger>
          <TabsTrigger
            value="eventos"
            className="shrink-0 gap-2 text-xs sm:text-sm"
          >
            <IoPeopleOutline className="text-lg" />
            Eventos
          </TabsTrigger>
          <TabsTrigger
            value="tipos-de-evento"
            className="shrink-0 gap-2 text-xs sm:text-sm"
          >
            <IoCalendarOutline className="text-lg" />
            Tipos de evento
          </TabsTrigger>
          <TabsTrigger
            value="categorias"
            className="shrink-0 gap-2 text-xs sm:text-sm"
          >
            <IoPricetagOutline className="text-lg" />
            Categorías
          </TabsTrigger>
          <TabsTrigger
            value="colecciones"
            className="shrink-0 gap-2 text-xs sm:text-sm"
          >
            <IoFolderOpenOutline className="text-lg" />
            Colecciones
          </TabsTrigger>
          <TabsTrigger
            value="regalos"
            className="shrink-0 gap-2 text-xs sm:text-sm"
          >
            <IoGiftOutline className="text-lg" />
            Regalos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transacciones" className="mt-6">
          {transactions.length === 0 ? (
            <EmptyState
              icon={
                <IoSwapHorizontalOutline className="text-4xl sm:text-6xl" />
              }
              title="Sin transacciones"
              description="Todavía no hay transacciones en ningún evento"
            />
          ) : (
            <Suspense fallback={<DashboardTransactionsSkeleton />}>
              <AdminTransactionsList transactions={transactions} />
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="retiros" className="mt-6">
          {payouts.length === 0 ? (
            <EmptyState
              icon={<IoCashOutline className="text-4xl sm:text-6xl" />}
              title="Sin solicitudes de retiro"
              description="Todavía no hay solicitudes de retiro en ningún evento"
            />
          ) : (
            <Suspense fallback={<DashboardTransactionsSkeleton />}>
              <AdminPayoutsList payouts={payouts} />
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="eventos" className="mt-6">
          {events.length === 0 ? (
            <EmptyState
              icon={<IoPeopleOutline className="text-4xl sm:text-6xl" />}
              title="Sin eventos"
              description="Todavía no hay eventos registrados"
            />
          ) : (
            <Suspense fallback={<DashboardTransactionsSkeleton />}>
              <AdminEventsList events={events} />
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="tipos-de-evento" className="mt-6">
          <Suspense fallback={<DashboardTransactionsSkeleton />}>
            <AdminEventTypesList eventTypes={eventTypes} />
          </Suspense>
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <Suspense fallback={<DashboardTransactionsSkeleton />}>
            <AdminCategoriesList
              categories={categories}
              eventTypes={eventTypes}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="colecciones" className="mt-6">
          <Suspense fallback={<DashboardTransactionsSkeleton />}>
            <AdminGiftlistsList
              giftlists={adminGiftlists}
              gifts={gifts}
              categories={categories}
              eventTypes={eventTypes}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="regalos" className="mt-6">
          <Suspense fallback={<DashboardTransactionsSkeleton />}>
            <AdminGiftsList
              gifts={gifts}
              categories={categories}
              giftlists={giftlists}
              eventTypes={eventTypes}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
