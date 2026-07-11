import { ContentLayout } from '@/components/admin-panel/content-layout';
import DashboardWallet from '@/components/dashboard/dashboard-wallet';

export default function BilleteraPage() {
  return (
    <ContentLayout title="Mi billetera">
      <DashboardWallet />
    </ContentLayout>
  );
}
