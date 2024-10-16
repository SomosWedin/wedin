import { ContentLayout } from "@/components/admin-panel/content-layout";
import DashboardBankDetails from "@/components/dashboard/dashboard-bank-details";

export default function BankDetailsPage() {
  return (
    <ContentLayout title="Configuración Bancaria">
      <DashboardBankDetails />
    </ContentLayout>
  );
}