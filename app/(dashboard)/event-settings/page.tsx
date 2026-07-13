import { ContentLayout } from "@/components/admin-panel/content-layout";
import DashboardEventSettings from "@/components/dashboard/dashboard-event-settings";

export default function EventSettingsPage() {
  return (
    <ContentLayout title="Detalles de tu evento">
      <DashboardEventSettings />
    </ContentLayout>
  );
}