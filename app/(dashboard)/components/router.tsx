'use client';

import React, { useState } from 'react';
import DashboardHome from './dashboard-home';
import DashboardEvent from './dashboard-event';
import DashboardWishlist from './dashboard-wishlist';
import DashboardSettings from './dashboard-settings';
import DashboardTransactions from './dashboard-transactions';
import { DASHBOARD_ROUTES } from '@/utils/constants';
import { useGlobalContext } from '@/context/GlobalContext';

export default function DashboardRouter() {
  const { activeMenuItem } = useGlobalContext();

  if (activeMenuItem === DASHBOARD_ROUTES.HOME) return <DashboardHome />;
  if (activeMenuItem === DASHBOARD_ROUTES.EVENT) return <DashboardEvent />;
  if (activeMenuItem === DASHBOARD_ROUTES.WISHLIST) return <DashboardWishlist />;
  if (activeMenuItem === DASHBOARD_ROUTES.SETTINGS) return <DashboardSettings />;
  if (activeMenuItem === DASHBOARD_ROUTES.TRANSACTIONS) return <DashboardTransactions />;
  return <DashboardHome />;
}
