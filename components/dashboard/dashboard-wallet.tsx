import { lazy, Suspense } from 'react'
import { IoWalletOutline } from 'react-icons/io5'
import { getEvent } from '@/actions/data/event'
import { getPayouts, getWalletSummary } from '@/actions/data/payout'
import EmptyState from '@/components/common/empty-state'
import RequestPayoutDialog from '@/components/dialog/request-payout-dialog'
import DashboardTransactionsSkeleton from '@/components/skeletons/dashboard-transactions'

const WalletPayoutsList = lazy(
  () => import('@/components/dashboard/wallet-payouts-list')
)

export default async function DashboardWallet() {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return <div>Error</div>
  }

  const [summary, payouts] = await Promise.all([
    getWalletSummary(event.id),
    getPayouts(event.id),
  ])

  return (
    <div className="w-full h-full flex items-center flex-col gap-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Mi billetera</h1>
          <p className="text-textTertiary">
            El monto que envíes a tu cuenta te llegará dentro de las 72 horas
            hábiles.
          </p>
        </div>
        <RequestPayoutDialog eventId={event.id} balance={summary.balance} />
      </div>

      {payouts.length === 0 ? (
        <EmptyState
          icon={<IoWalletOutline className="text-4xl sm:text-6xl" />}
          title="Sin movimientos"
          description="Todavía no has solicitado ningún retiro"
        />
      ) : (
        <Suspense fallback={<DashboardTransactionsSkeleton />}>
          <WalletPayoutsList summary={summary} payouts={payouts} />
        </Suspense>
      )}
    </div>
  )
}
