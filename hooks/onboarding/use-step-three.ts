'use client';

import { StepThreeSchema } from '@/schemas/onboarding';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

export type StepThreeValues = z.infer<typeof StepThreeSchema>;

type UseStepThreeProps = {
  onSubmit: (
    values: StepThreeValues
  ) => Promise<void> | void;
};

export function useStepThree({
  onSubmit,
}: UseStepThreeProps) {
  const form = useForm<StepThreeValues>({
    resolver: zodResolver(StepThreeSchema),
    mode: 'all',
    defaultValues: {
      eventCountry: 'Paraguay',
      eventCity: '',
      isDecidingEventLocation: false,
    },
  });

  const eventCountry =
    useWatch({
      control: form.control,
      name: 'eventCountry',
    }) ?? '';

  const eventCity =
    useWatch({
      control: form.control,
      name: 'eventCity',
    }) ?? '';

  const isDecidingEventLocation =
    useWatch({
      control: form.control,
      name: 'isDecidingEventLocation',
    }) ?? false;

  const isButtonEnabled =
    isDecidingEventLocation ||
    (eventCountry.trim().length > 0 &&
      eventCity.trim().length > 0);

  const handleDecidingChange = (
    checked: boolean | 'indeterminate'
  ) => {
    const isChecked = checked === true;

    form.setValue(
      'isDecidingEventLocation',
      isChecked,
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );

    if (isChecked) {
      form.setValue('eventCountry', '', {
        shouldDirty: true,
        shouldValidate: true,
      });

      form.setValue('eventCity', '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const handleSubmit = form.handleSubmit(onSubmit);

  return {
    form,
    handleSubmit,
    isButtonEnabled,
    isDecidingEventLocation,
    handleDecidingChange,
  };
}
