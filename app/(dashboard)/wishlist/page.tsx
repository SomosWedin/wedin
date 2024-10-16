import { ContentLayout } from "@/components/admin-panel/content-layout";
import DashboardWishlist from '@/components/dashboard/dashboard-wishlist';

export default function WishlistPage() {
  return (
    <ContentLayout title="Mi lista">
      <DashboardWishlist />
    </ContentLayout>
  );
}