import { Suspense, lazy } from 'react';
import { getEvent } from '@/actions/data/event';
import DashboardSettingsSkeleton from '@/components/skeletons/dashboard-settings';
import { getBankDetails } from '@/actions/data/bank-details';

const DashboardBankDetailsUpdateForm = lazy(
  () => import('@/components/forms/dashboard/bank-details-update')
);

export default async function DashboardBankDetails() {
  const event = await getEvent();

  if (!event || 'error' in event) {
    return <div>Error</div>;
  }

  const bankDetails = await getBankDetails(event.id);

  return (
    <section className="w-full h-full flex flex-col gap-12 sm:gap-8 justify-start items-center">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Configuración Bancaria</h1>
        <p className="text-textTertiary">
          Define los detalles importantes de tu evento: Configuración Bancaria.
        </p>
      </div>

      <Suspense fallback={<DashboardSettingsSkeleton />}>
        <DashboardBankDetailsUpdateForm
          eventId={event.id}
          bankDetails={bankDetails}
        />
      </Suspense>
    </section>
  );
}
