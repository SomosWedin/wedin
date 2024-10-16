import { ContentLayout } from "@/components/admin-panel/content-layout";
import DashboardTransactions from '@/components/dashboard/dashboard-transactions';

export default function TransactionsPage() {
  return (
    <ContentLayout title="Mi lista">
      <DashboardTransactions />
    </ContentLayout>
  );
}