import React, { useState, useEffect } from 'react';
import DashboardHome from './dashboard-home';
import DashboardEvent from './dashboard-event';
import DashboardWishlist from './dashboard-wishlist';
import { DASHBOARD_ROUTES } from '@/utils/constants';
import Loader from '@/components/common/loader';

type ModalControllerProps = {
  content: string | null;
};

export default function DashboardController({ content }: ModalControllerProps) {
  const [loading, setLoading] = useState(false);

  if (loading) {
    return <Loader mfHeight="h-screen" />;
  }

  if (content === DASHBOARD_ROUTES.HOME) return <DashboardHome />;
  if (content === DASHBOARD_ROUTES.EVENT) return <DashboardEvent />;
  if (content === DASHBOARD_ROUTES.WISHLIST) return <DashboardWishlist />;
  return null;
}
