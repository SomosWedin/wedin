
import Sidebar from '@/components/sidebar/sidebar';
import DashboardRouter from '../components/router';
import { DashboardProvider } from '../components/context';

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <div className="flex items-start justify-center">
        <Sidebar />
        <DashboardRouter />
      </div>
    </DashboardProvider>
  );
}
