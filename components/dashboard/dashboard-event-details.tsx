import DashboardEventDetailsSkeleton from '@/components/skeletons/dashboard-event-details';
import { Suspense, lazy } from 'react';
import { getEvent } from '@/actions/data/event';
import type { Image } from '@prisma/client';

const EventDetailsUpdateForm = lazy(() => import('@/components/forms/dashboard/event-details-update-form'));

export default async function DashboardEventDetails() {
  const event = await getEvent();
  
  if (!event || 'error' in event) {
    return <p>Error: {event.error}</p>; 
  }

 return (
    <section className="w-full h-full flex justify-start items-center flex-col gap-12">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Presentación</h1>
        <p className="text-textTertiary">
          Haz que tu evento brille: sube fotos y cuenta de qué se trata, para
          que tus invitados se emocionen.
        </p>
      </div>

      <Suspense fallback={<DashboardEventDetailsSkeleton />}>
        <EventDetailsUpdateForm
          event={event}
        />
      </Suspense>
    </section>
  );
}
