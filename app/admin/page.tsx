import { redirect } from 'next/navigation'
import { lazy, Suspense } from 'react'
import { IoCashOutline, IoGiftOutline } from 'react-icons/io5'
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

export default async function AdminPage() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [transactions, payouts] = await Promise.all([
    getAllTransactionsForAdmin(),
    getAllPayoutsForAdmin(),
  ])

  return (
    <div className="container w-full h-full flex items-center flex-col gap-6 p-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black">Panel de staff</h1>
          <p className="text-textTertiary">
            Todas las transacciones y solicitudes de retiro de todos los
            eventos. Cambiar el estado queda registrado con tu usuario.
          </p>
        </div>
      </div>

      <Tabs defaultValue="transacciones" className="w-full">
        <TabsList className="gap-2 sm:gap-3">
          <TabsTrigger
            value="transacciones"
            className="gap-2 text-xs sm:text-sm"
          >
            <IoGiftOutline className="text-lg" />
            Transacciones
          </TabsTrigger>
          <TabsTrigger value="retiros" className="gap-2 text-xs sm:text-sm">
            <IoCashOutline className="text-lg" />
            Solicitudes de retiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transacciones" className="mt-6">
          {transactions.length === 0 ? (
            <EmptyState
              icon={<IoGiftOutline className="text-6xl" />}
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
              icon={<IoCashOutline className="text-6xl" />}
              title="Sin solicitudes de retiro"
              description="Todavía no hay solicitudes de retiro en ningún evento"
            />
          ) : (
            <Suspense fallback={<DashboardTransactionsSkeleton />}>
              <AdminPayoutsList payouts={payouts} />
            </Suspense>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
