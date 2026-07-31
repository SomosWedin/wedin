'use client';

import { StepFourSchema } from '@/schemas/onboarding';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import {
  useForm,
  useWatch,
} from 'react-hook-form';
import type { z } from 'zod';

export type StepFourValues = z.infer<
  typeof StepFourSchema
>;

type UseStepFourProps = {
  onSubmit: (
    values: StepFourValues,
  ) => Promise<void> | void;
};

export function useStepFour({
  onSubmit,
}: UseStepFourProps) {
  const [isCalendarOpen, setIsCalendarOpen] =
    useState(false);

  const form = useForm<StepFourValues>({
    resolver: zodResolver(StepFourSchema),
    mode: 'all',
    defaultValues: {
      eventDate: undefined,
      isDecidingEventDate: false,
    },
  });

  const eventDate = useWatch({
    control: form.control,
    name: 'eventDate',
  });

  const isDecidingEventDate =
    useWatch({
      control: form.control,
      name: 'isDecidingEventDate',
    }) ?? false;

  const isButtonEnabled =
    Boolean(eventDate) || isDecidingEventDate;

  const handleCalendarOpenChange = (
    open: boolean,
  ) => {
    if (!isDecidingEventDate) {
      setIsCalendarOpen(open);
    }
  };

  const handleDateChange = (
    date: Date | undefined,
  ) => {
    form.setValue('eventDate', date, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setIsCalendarOpen(false);
  };

  const handleDecidingChange = (
    checked: boolean | 'indeterminate',
  ) => {
    const isChecked = checked === true;

    form.setValue(
      'isDecidingEventDate',
      isChecked,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );

    if (isChecked) {
      form.setValue('eventDate', undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setIsCalendarOpen(false);
    }
  };

  const handleSubmit =
    form.handleSubmit(onSubmit);

  return {
    form,
    eventDate,
    isCalendarOpen,
    isDecidingEventDate,
    isButtonEnabled,
    handleCalendarOpenChange,
    handleDateChange,
    handleDecidingChange,
    handleSubmit,
  };
}
