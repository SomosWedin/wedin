"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { DASHBOARD_ROUTES } from "@/utils/constants";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

type GlobalContextType = {
  activeMenuItem: string;
  setActiveMenuItem: (menuItem: string) => void;
  theme: string;
  toggleTheme: () => void;
};

const GlobalContext = createContext<GlobalContextType>({
  activeMenuItem: DASHBOARD_ROUTES.HOME,
  setActiveMenuItem: () => {},
  theme: 'light',
  toggleTheme: () => {},
});

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [activeMenuItem, setActiveMenuItemState] = useState<string>(() => {
    const menuParam = searchParams.get("menu");
    return menuParam || DASHBOARD_ROUTES.HOME;
  });

  const setActiveMenuItem = (menuItem: string) => {
    setActiveMenuItemState(menuItem);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("menu", menuItem);
    router.replace(`${pathname}?${newSearchParams.toString()}`);
  };

  const [theme, setTheme] = useState<string>('light');
  const toggleTheme = useMemo(() => {
    return () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(() => ({
    activeMenuItem,
    setActiveMenuItem,
    theme,
    toggleTheme,
  }), [activeMenuItem, theme]);

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};