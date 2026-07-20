import { Suspense, lazy } from 'react';
import { redirect } from 'next/navigation';
import EmptyState from '@/components/common/empty-state';
import { IoGiftOutline } from 'react-icons/io5';
import DashboardTransactionsSkeleton from '@/components/skeletons/dashboard-transactions';
import { getCurrentUser } from '@/actions/get-current-user';
import { getAllTransactionsForAdmin } from '@/actions/data/transaction';

const AdminTransactionsList = lazy(
  () => import('@/components/admin/admin-transactions-list')
);

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const transactions = await getAllTransactionsForAdmin();

  return (
    <div className="w-full h-full flex items-center flex-col gap-8 p-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Transacciones (staff)</h1>
          <p className="text-textTertiary">
            Todas las transacciones de todos los eventos. Cambiar el estado
            queda registrado con tu usuario.
          </p>
        </div>
      </div>

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
    </div>
  );
}
