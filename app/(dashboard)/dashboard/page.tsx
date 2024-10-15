import { ContentLayout } from "@/components/admin-panel/content-layout";
import DashboardRouter from '../components/router';

export default function DashboardPage() {
  return (
    <ContentLayout title="Dashboard">
      <DashboardRouter />
    </ContentLayout>
  );
}