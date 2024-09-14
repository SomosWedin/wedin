import { useState } from 'react';
import { stepTwo } from '@/actions/onboarding/step-two';
import { User } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';

export const useOnbStepTwo = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const updateUser = async (user: User) => {
    setLoading(true);

    try {
      const response = await stepTwo(user);
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
    updateUser,
    loading,
  };
};
