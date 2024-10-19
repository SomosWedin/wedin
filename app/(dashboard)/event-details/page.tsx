import { ContentLayout } from '@/components/admin-panel/content-layout';
import { Suspense } from 'react';
import { lazy } from 'react';
import DashboardEventDetailsSkeleton from '@/components/skeletons/dashboard-event-details';
import { getEvent } from '@/actions/data/event';

const DashboardEventDetails = lazy(
  () => import('@/components/dashboard/dashboard-event-details')
);

export default async function EventDetailsPage() {
  const event = await getEvent();

  if (!event || 'error' in event) {
    return null;
  }

  return (
    <ContentLayout title="Presentación">
      <Suspense fallback={<DashboardEventDetailsSkeleton />}>
        <DashboardEventDetails event={event} />
      </Suspense>
    </ContentLayout>
  );
}
