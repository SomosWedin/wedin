'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const createContributionSchema = (
  remaining: number
) =>
  z
    .object({
      amount: z
        .string()
        .min(1, {
          message: 'Ingresá un monto',
        }),
      completeRemaining: z
        .boolean()
        .default(false),
    })
    .refine(
      values => {
        const amount = Number(values.amount);

        return (
          Number.isFinite(amount) &&
          amount > 0 &&
          amount <= remaining
        );
      },
      {
        message:
          `El monto debe ser mayor a 0 y no superar Gs. ` +
          remaining.toLocaleString('es-PY'),
        path: ['amount'],
      }
    );

export type ContributionFormValues = z.infer<
  ReturnType<typeof createContributionSchema>
>;

type UseGiftContributionProps = {
  open: boolean;
  remaining: number;
  initialAmount?: string;
  onAddToCart: (amount: string) => void;
  onOpenChange: (open: boolean) => void;
};

export function useGiftContribution({
  open,
  remaining,
  initialAmount,
  onAddToCart,
  onOpenChange,
}: UseGiftContributionProps) {
  const schema = useMemo(
    () => createContributionSchema(remaining),
    [remaining]
  );

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(schema),
    mode: 'all',
    defaultValues: {
      amount: initialAmount ?? '',
      completeRemaining: false,
    },
  });

  const amount =
    useWatch({
      control: form.control,
      name: 'amount',
    }) ?? '';

  const completeRemaining =
    useWatch({
      control: form.control,
      name: 'completeRemaining',
    }) ?? false;

  const suggestedAmounts = useMemo(
    () =>
      [0.1, 0.25, 0.5]
        .map(fraction =>
          Math.max(
            1000,
            Math.round(
              (remaining * fraction) / 1000
            ) * 1000
          )
        )
        .filter(
          (suggestedAmount, index, values) =>
            suggestedAmount < remaining &&
            values.indexOf(suggestedAmount) ===
            index
        ),
    [remaining]
  );

  useEffect(() => {
    form.reset({
      amount: open
        ? initialAmount ?? ''
        : '',
      completeRemaining: false,
    });

    if (open) {
      void form.trigger();
    }
  }, [open, initialAmount, form]);

  useEffect(() => {
    if (open) {
      void form.trigger('amount');
    }
  }, [remaining, open, form]);

  const handleSuggestedAmount = (
    suggestedAmount: number
  ) => {
    form.setValue(
      'completeRemaining',
      false,
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );

    form.setValue(
      'amount',
      String(suggestedAmount),
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );
  };

  const handleCompleteRemainingChange = (
    checked: boolean | 'indeterminate'
  ) => {
    const isChecked = checked === true;

    form.setValue(
      'completeRemaining',
      isChecked,
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );

    if (isChecked) {
      form.setValue(
        'amount',
        String(remaining),
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );
    }
  };

  const handleAmountChange = (
    nextAmount: string
  ) => {
    form.setValue('amount', nextAmount, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (completeRemaining) {
      form.setValue(
        'completeRemaining',
        false,
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );
    }
  };

  const handleSubmit = form.handleSubmit(
    values => {
      onAddToCart(values.amount);
      onOpenChange(false);
    }
  );

  return {
    form,
    amount,
    completeRemaining,
    suggestedAmounts,
    isValid: form.formState.isValid,
    handleAmountChange,
    handleSuggestedAmount,
    handleCompleteRemainingChange,
    handleSubmit,
  };
}
