'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DASHBOARD_ROUTES } from '@/utils/constants';

type DashboardContextType = {
    activeMenuItem: string;
    setActiveMenuItem: (menuItem: string) => void;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [activeMenuItem, setActiveMenuItem] = useState<string>(() => {
    const savedMenuItem = localStorage.getItem('activeMenuItem');
    return savedMenuItem ? JSON.parse(savedMenuItem) : DASHBOARD_ROUTES.HOME;
  });

  useEffect(() => {
    if (activeMenuItem) {
      localStorage.setItem('activeMenuItem', JSON.stringify(activeMenuItem));
    }
  }, [activeMenuItem]);

  return (
    <DashboardContext.Provider value={{ activeMenuItem, setActiveMenuItem }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within an DashboardProvider');
  }
  return context;
};