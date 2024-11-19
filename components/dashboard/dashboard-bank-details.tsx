import { Suspense, lazy } from 'react';
import { getEvent } from '@/actions/data/event';
import { getCurrentUser } from '@/actions/get-current-user';
import DashboardSettingsSkeleton from '@/components/skeletons/dashboard-settings';

const DashboardBankDetailsUpdateForm = lazy(
  () => import('@/components/forms/dashboard/bank-details-update')
);

export default function DashboardBankDetails() {
  return (
    <section className="w-full h-full flex flex-col gap-8 sm:gap-12 justify-start items-center">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Configuración Bancaria</h1>
        <p className="text-textTertiary">
          Define los detalles importantes de tu evento: Configuración Bancaria.
        </p>
      </div>

      <Suspense fallback={<DashboardSettingsSkeleton />}>
        <DashboardBankDetailsUpdateForm />
      </Suspense>
    </section>
  );
}
