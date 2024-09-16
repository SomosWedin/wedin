import * as React from 'react';
import { useState } from 'react';
import { stepThree } from '@/actions/onboarding/step-three';
import { useToast } from '@/hooks/use-toast';
import { StepThreeSchema } from '@/schemas/onboarding';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

export const useOnbStepThree = () => {
  const { toast } = useToast();
  const [isDeciding, setIsDeciding] = React.useState<boolean | string>(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof StepThreeSchema>>({
    resolver: zodResolver(StepThreeSchema),
    defaultValues: {
      eventCountry: '',
      eventCity: '',
      isDecidingEventLocation: false,
    },
  });

    const { formState: { isDirty } } = form;

  const onSubmit = async (values: z.infer<typeof StepThreeSchema>) => {
    setLoading(true);
    const validatedFields = StepThreeSchema.safeParse(values);
    if (validatedFields.success) {
      const response = await stepThree(validatedFields.data);

      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error en el paso 3. Intenta de nuevo.',
          description: response.error,
        });

        setLoading(false);
        return null;
      }
      setLoading(false);
    }
  };

  const handleIsDecidingCountryCity = (value: boolean | string) => {
    setIsDeciding(value);
    if (value) {
      form.setValue('eventCountry', '');
      form.setValue('eventCity', '');
    }
  };

  return {
    form,
    loading,
    onSubmit,
    handleIsDecidingCountryCity,
    isDeciding,
    isDirty,
  };
};
