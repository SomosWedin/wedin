
import Sidebar from '@/components/sidebar/sidebar';
import DashboardController from '../components/controller';
import { DashboardProvider } from '../components/context';

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <div className="flex items-start justify-center">
        <Sidebar />
        <DashboardController />
      </div>
    </DashboardProvider>
  );
}
