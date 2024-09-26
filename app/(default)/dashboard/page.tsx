'use client';

import { useState } from 'react';
import Sidebar from '@/components/sidebar/sidebar';
import DashboardController from './components/dashboard-controller';
import { DASHBOARD_ROUTES } from '@/utils/constants';

export default function DashboardPage() {
  const [activeMenuItem, setActiveMenuItem] = useState<string>(DASHBOARD_ROUTES.HOME);

  const handleMenuItemChange = (menuItem: string) => {
    setActiveMenuItem(menuItem);
  };

  return (
    <div className="flex items-start justify-center">
      <Sidebar onMenuItemClick={handleMenuItemChange} />
      <DashboardController content={activeMenuItem} />
    </div>
  );
}
