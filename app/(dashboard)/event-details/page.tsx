import { ContentLayout } from "@/components/admin-panel/content-layout";
import DashboardEvent from '@/components/dashboard/dashboard-event-details';
//add lazy loading and suspense
export default function EventDetailsPage() {
  return (
    <ContentLayout title="Presentación">
      <DashboardEvent />
    </ContentLayout>
  );
}