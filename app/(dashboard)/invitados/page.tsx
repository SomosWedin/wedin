import { ContentLayout } from '@/components/admin-panel/content-layout'
import DashboardGuests from '@/components/dashboard/dashboard-guests'

export default function InvitadosPage() {
  return (
    <ContentLayout title="Invitados">
      <DashboardGuests />
    </ContentLayout>
  )
}
