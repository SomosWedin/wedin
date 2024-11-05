import { ContentLayout } from "@/components/admin-panel/content-layout";
import DashboardHome from '@/components/dashboard/dashboard-home';

export default function DashboardPage() {
  return (
    <ContentLayout title="Inicio">
      <DashboardHome />
    </ContentLayout>
  );
}