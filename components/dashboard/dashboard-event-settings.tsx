import { Suspense, lazy } from 'react';
import { getEvent } from '@/actions/data/event';
import { getCurrentUser } from '@/actions/get-current-user';
import DashboardSettingsSkeleton from '@/components/skeletons/dashboard-settings';

const DashboardEventSettingsForm = lazy(
  () => import('@/components/forms/dashboard/event-settings')
);

export default async function DashboardEventSettings() {
  const event = await getEvent();
  const currentUser = await getCurrentUser();

  if (!event || 'error' in event || !currentUser || 'error' in currentUser) {
    return <div>Error</div>;
  }

  return (
    <section className="w-full h-full flex flex-col gap-8 sm:gap-12 justify-start items-center">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Configuración General</h1>
        <p className="text-textTertiary">
          Define los detalles importantes de tu evento: establece la fecha,
          añade invitados.
        </p>
      </div>

      <Suspense fallback={<DashboardSettingsSkeleton />}>
        <DashboardEventSettingsForm event={event} currentUser={currentUser} />
      </Suspense>
    </section>
  );
}
