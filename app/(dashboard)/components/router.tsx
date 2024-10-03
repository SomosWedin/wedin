'use client';

import React, { useState } from 'react';
import DashboardHome from './dashboard-home';
import DashboardEvent from './dashboard-event';
import DashboardWishlist from './dashboard-wishlist';
import DashboardSettings from './dashboard-settings';
import { DASHBOARD_ROUTES } from '@/utils/constants';
import Loader from '@/components/common/loader';
import { useDashboard } from './context';

export default function DashboardRouter() {
  const { activeMenuItem } = useDashboard();
  const [loading, setLoading] = useState(false);

  if (loading) {
    return <Loader mfHeight="h-screen" />;
  }

  if (activeMenuItem === DASHBOARD_ROUTES.HOME) return <DashboardHome />;
  if (activeMenuItem === DASHBOARD_ROUTES.EVENT) return <DashboardEvent />;
  if (activeMenuItem === DASHBOARD_ROUTES.WISHLIST) return <DashboardWishlist />;
  if (activeMenuItem === DASHBOARD_ROUTES.SETTINGS) return <DashboardSettings />;
  return null;
}
