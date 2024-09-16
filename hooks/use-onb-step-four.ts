import * as React from 'react';
import { useState } from 'react';
import { stepFour } from '@/actions/onboarding/step-four';
import { useToast } from '@/hooks/use-toast';
import { StepFourSchema } from '@/schemas/onboarding';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useOnboarding } from '@/app/(onboarding)/components/context';

export const useOnbStepFour = () => {
  const { toast } = useToast();
  const { setCurrentPage } = useOnboarding();
  const [isDeciding, setIsDeciding] = React.useState<boolean | string>(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof StepFourSchema>>({
    resolver: zodResolver(StepFourSchema),
    defaultValues: {
      eventDate: undefined,
      isDecidingEventDate: false,
    },
  });

    const { formState: { isDirty } } = form;

  const onSubmit = async (values: z.infer<typeof StepFourSchema>) => {
    setLoading(true);
    const validatedFields = StepFourSchema.safeParse(values);
    if (validatedFields.success) {
      const response = await stepFour(validatedFields.data);

      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error en el paso 4. Intenta de nuevo.',
          description: response.error,
        });

        setLoading(false);
        return null;
      } else {
        setCurrentPage(5);
      }
      setLoading(false);
    }
  };

  const handleIsDecidingEventDate = (value: boolean | string) => {
    setIsDeciding(value);
    if (value) {
      form.setValue('eventDate', undefined);
    }
  };

  return {
    form,
    loading,
    onSubmit,
    handleIsDecidingEventDate,
    isDeciding,
    isDirty,
  };
};
