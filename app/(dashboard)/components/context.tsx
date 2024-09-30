'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import { DASHBOARD_ROUTES } from '@/utils/constants';

type DashboardContextType = {
  activeMenuItem: string;
  setActiveMenuItem: Dispatch<SetStateAction<string>>;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Custom hook for local storage
const useLocalStorage = (key: string, initialValue: string): [string, Dispatch<SetStateAction<string>>, boolean] => {
  const [storedValue, setStoredValue] = useState<string>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false); 

  useEffect(() => {
    const item = localStorage.getItem(key);
    if (item) {
      setStoredValue(JSON.parse(item));
    }
    setIsHydrated(true); // We are now on the client and localStorage is accessible
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(key, JSON.stringify(storedValue));
    }
  }, [key, storedValue, isHydrated]);

  return [storedValue, setStoredValue, isHydrated];
};

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [activeMenuItem, setActiveMenuItem, isHydrated] = useLocalStorage('activeMenuItem', DASHBOARD_ROUTES.HOME);

  if (!isHydrated) return null;

  return (
    <DashboardContext.Provider value={{ activeMenuItem, setActiveMenuItem }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};