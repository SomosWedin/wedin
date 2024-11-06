import { useState } from 'react';
import { stepOne } from '@/actions/onboarding/step-one';
import { EventType } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/app/onboarding/context';

export const useOnbStepOne = () => {
  const { toast } = useToast();
  const { setCurrentPage } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const updateEventType = async (eventType: EventType) => {
    setLoading(true);

    try {
      const response = await stepOne(eventType);
      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error! 😢',
          description: response.error,
        });
        return null;
      }
      setCurrentPage(2);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error! 😢',
        description: 'Ocorrio un error al crear tu evento, Intente de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    updateEventType,
    loading,
  };
};
