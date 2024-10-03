import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, EventType } from '@prisma/client';

type OnboardingContextType = {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  currentUser?: User | null;
  eventType?: EventType;
  setEventType: (type: EventType) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children, currentUser }: { children: ReactNode,  currentUser?: User | null }) => {
  const [currentPage, setCurrentPage] = useState(currentUser?.onboardingStep || 1);
  const [eventType, setEventType] = useState<EventType | undefined>(() => {
    const savedEventType = localStorage.getItem('eventType');
    return savedEventType ? JSON.parse(savedEventType) : undefined;
  });

  useEffect(() => {
    if (eventType) {
      localStorage.setItem('eventType', JSON.stringify(eventType));
    }
  }, [eventType]);


  return (
    <OnboardingContext.Provider value={{ currentPage, setCurrentPage, eventType, setEventType }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};