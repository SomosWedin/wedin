import { useState } from 'react';
import { stepFive } from '@/actions/onboarding/step-five';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/app/onboarding/context';

export const useOnbStepFive = () => {
  const { toast } = useToast();
  const { setCurrentPage } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const finalizeOnboarding = async () => {
    setLoading(true);
    const response = await stepFive();

    if (response?.error) {
      toast({
        variant: 'destructive',
        title: 'Error en el paso 5. Intenta de nuevo.',
        description: response.error,
      });

      setLoading(false);
      return null;
    }
    setCurrentPage(6);
    setLoading(false);
  };

  return {
    loading,
    finalizeOnboarding,
  };
};
