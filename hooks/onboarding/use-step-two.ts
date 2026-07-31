'use client';

import { StepTwoSchema } from '@/schemas/onboarding';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventType } from '@prisma/client';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

export type StepTwoValues = z.infer<
  typeof StepTwoSchema
>;

type UseStepTwoProps = {
  onSubmit: (
    values: StepTwoValues
  ) => Promise<void> | void;
};

export function useStepTwo({
  onSubmit,
}: UseStepTwoProps) {
  const form = useForm<StepTwoValues>({
    resolver: zodResolver(StepTwoSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      lastName: '',
      partnerName: '',
      partnerLastName: '',
      eventType: EventType.WEDDING,
    },
  });

  const eventType =
    useWatch({
      control: form.control,
      name: 'eventType',
    }) ?? EventType.WEDDING;

  const { setValue } = form;

  useEffect(() => {
    const storedEventType =
      localStorage.getItem('eventType');

    if (
      storedEventType &&
      Object.values(EventType).includes(
        storedEventType as EventType
      )
    ) {
      setValue(
        'eventType',
        storedEventType as EventType,
        {
          shouldDirty: false,
          shouldValidate: true,
        }
      );
    }
  }, [setValue]);

  const handleSubmit = form.handleSubmit(onSubmit);

  return {
    form,
    eventType,
    isValid: form.formState.isValid,
    handleSubmit,
  };
}
