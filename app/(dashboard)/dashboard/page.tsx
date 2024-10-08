import dynamic from 'next/dynamic';
const Sidebar = dynamic(() => import('@/components/sidebar/sidebar'), { ssr: false });
import DashboardRouter from '../components/router';

export default function DashboardPage() {
  return (
    <div className="flex items-start justify-center">
      <div className='hidden md:block'>
        <Sidebar />
      </div>
      <DashboardRouter />
    </div>
  );
}