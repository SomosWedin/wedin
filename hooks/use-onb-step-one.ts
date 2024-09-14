import { useState } from 'react';
import { stepOne } from '@/actions/onboarding/step-one';
import { EventType } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';

export const useOnbStepOne = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEventType = async (eventType: EventType) => {
    setLoading(true);
    setError(null);

    try {
      const response = await stepOne(eventType);
      if (response.error) {
        setError(response.error);
        toast({
            variant: 'destructive',
            title: 'Error al registrar usuario.',
            description: 'Error actualizando tu perfil',
          });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar usuario.',
        description: 'Error actualizando tu perfil',
      });
      setError('Error actualizando tu perfil');
    } finally {
      setLoading(false);
    }
  };

  return {
    updateEventType,
    loading,
    error,
  };
};
