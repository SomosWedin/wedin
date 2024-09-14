import { useState } from 'react';
import { stepOne } from '@/actions/onboarding/step-one';
import { EventType } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';

export const useOnbStepOne = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const updateEventType = async (eventType: EventType) => {
    setLoading(true);

    try {
      const response = await stepOne(eventType);
      if (response.error) {
        toast({
          variant: 'destructive',
          title: 'Error! 😢',
          description: response.error,
        });
      }
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
