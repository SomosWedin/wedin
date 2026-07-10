import { Suspense, lazy } from 'react';
import EmptyState from '@/components/common/empty-state';
import { IoGiftOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { LuArrowUpRight } from 'react-icons/lu';
import DashboardTransactionsSkeleton from '@/components/skeletons/dashboard-transactions';
import { getEvent } from '@/actions/data/event';
import { getTransactions } from '@/actions/data/transaction';

const DashboardTransactionsList = lazy(
  () => import('@/components/dashboard/dashboard-transactions-list')
);

export default async function DashboardTransactions() {
  const event = await getEvent();

  if (!event || 'error' in event) {
    return <div>Error</div>;
  }

  const transactions = await getTransactions({
    searchParams: { eventId: event.id },
  });

  return (
    <div className="w-full h-full flex items-center flex-col gap-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Regalos recibidos</h1>
          <p className="text-textTertiary">
            Revisa los regalos que ya has recibido: lleva un registro y retira
            el efectivo cuando lo necesites.
          </p>
        </div>
        <Button variant="success" className="gap-2">
          Gestionar retiro
          <LuArrowUpRight className="text-2xl" />
        </Button>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<IoGiftOutline className="text-6xl" />}
          title="Sin transacciones"
          description="Todavía no tienes regalos recibidos"
        />
      ) : (
        <Suspense fallback={<DashboardTransactionsSkeleton />}>
          <DashboardTransactionsList transactions={transactions} />
        </Suspense>
      )}
    </div>
  );
}
