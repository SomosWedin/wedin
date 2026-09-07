import { getEvent } from '@/actions/data/event'
import { getPayouts, getWalletSummary } from '@/actions/data/payout'
import WalletOverview from '@/components/dashboard/wallet-overview'

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
    <div className="flex flex-col gap-8 w-full h-full">
      <div className="flex flex-col gap-2 pb-6 border-b border-gray-200">
        <h1 className="text-2xl font-black">Mi billetera</h1>
        <p className="text-textTertiary">
          Acá se acumula el dinero de los regalos que recibís. Retiralo cuando
          quieras.
        </p>
      </div>

      <WalletOverview eventId={event.id} summary={summary} payouts={payouts} />
    </div>
  )
}
