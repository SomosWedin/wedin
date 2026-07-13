import { IoLockClosedOutline } from 'react-icons/io5';
import EmptyState from '@/components/common/empty-state';

export default function SiteUnavailable() {
  return (
    <EmptyState
      icon={<IoLockClosedOutline className="text-6xl" />}
      title="Este sitio no está disponible"
      description="Los organizadores desactivaron temporalmente esta página."
    />
  );
}
