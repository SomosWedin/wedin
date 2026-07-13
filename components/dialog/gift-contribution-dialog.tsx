'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IoGiftOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import PriceInput from '@/components/forms/common/price-input';
import GiftTypeBadge from '@/components/dashboard/gift-type-badge';
import GiftFavoriteBadge from '@/components/dashboard/gift-favorite-badge';
import type { Gift, Image as ImageModel } from '@prisma/client';

const createContributionSchema = (remaining: number) =>
  z
    .object({
      amount: z.string().min(1, { message: 'Ingresá un monto' }),
      completeRemaining: z.boolean().default(false),
    })
    .refine(
      values => {
        const amount = Number(values.amount);
        return amount > 0 && amount <= remaining;
      },
      {
        message: `El monto debe ser mayor a 0 y no superar Gs. ${remaining.toLocaleString(
          'es-PY'
        )}`,
        path: ['amount'],
      }
    );

type GiftContributionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift: Gift & { image: ImageModel | null };
  isFavoriteGift: boolean;
  remaining: number;
  percentage: number;
  onAddToCart: (amount: string) => void;
  initialAmount?: string;
};

export default function GiftContributionDialog({
  open,
  onOpenChange,
  gift,
  isFavoriteGift,
  remaining,
  percentage,
  onAddToCart,
  initialAmount,
}: GiftContributionDialogProps) {
  const contributionSchema = createContributionSchema(remaining);

  const form = useForm<z.infer<typeof contributionSchema>>({
    resolver: zodResolver(contributionSchema),
    mode: 'all',
    defaultValues: { amount: initialAmount ?? '', completeRemaining: false },
  });
  const { isValid } = form.formState;
  const completeRemaining = form.watch('completeRemaining');
  const amountValue = form.watch('amount');

  const suggestedAmounts = [0.1, 0.25, 0.5]
    .map(fraction =>
      Math.max(1000, Math.round((remaining * fraction) / 1000) * 1000)
    )
    .filter(
      (amount, index, all) =>
        amount < remaining && all.indexOf(amount) === index
    );

  const handleSelectSuggestedAmount = (amount: number) => {
    form.setValue('completeRemaining', false);
    form.setValue('amount', String(amount), { shouldValidate: true });
  };

  useEffect(() => {
    if (open) {
      form.reset({ amount: initialAmount ?? '', completeRemaining: false });
    } else {
      form.reset({ amount: '', completeRemaining: false });
    }
  }, [open, initialAmount, form]);

  useEffect(() => {
    if (completeRemaining) {
      form.setValue('amount', String(remaining), { shouldValidate: true });
    }
  }, [completeRemaining, remaining, form]);

  const onSubmit: SubmitHandler<
    z.infer<typeof contributionSchema>
  > = values => {
    onAddToCart(values.amount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Detalles del producto</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex gap-3 items-center">
              <div className="flex overflow-hidden justify-center items-center w-32 h-32 bg-gray-100 rounded-md shrink-0">
                {gift.image?.url ? (
                  <Image
                    src={gift.image.url}
                    alt={gift.name}
                    className="object-cover w-full h-full"
                    width={128}
                    height={128}
                  />
                ) : (
                  <IoGiftOutline className="text-3xl text-gray-400" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-normal text-base">{gift.name}</p>
                <p className="font-medium text-xl">
                  Gs. {Number(gift.price).toLocaleString('es-PY')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <GiftTypeBadge isGroupGift />
                  {isFavoriteGift && <GiftFavoriteBadge />}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-base">
                <span>Faltan: Gs. {remaining.toLocaleString('es-PY')}</span>
                <span>{percentage}%</span>
              </div>
              <Progress value={percentage} />
            </div>

            {suggestedAmounts.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Montos sugeridos</span>
                <div className="flex flex-wrap gap-2">
                  {suggestedAmounts.map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleSelectSuggestedAmount(amount)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                        !completeRemaining && amountValue === String(amount)
                          ? 'bg-success/10 border-success text-success'
                          : 'bg-white border-gray-200 text-textPrimary hover:bg-gray-50'
                      }`}
                    >
                      Gs. {amount.toLocaleString('es-PY')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a contribuir</FormLabel>
                  <FormControl>
                    <PriceInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="completeRemaining"
              render={({ field }) => (
                <FormItem className="flex gap-2 items-center space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 font-normal">
                    Completar el valor total del regalo
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-[3] bg-gray-100 hover:bg-gray-200 transition-colors border-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={!isValid}
                className="flex-[7]"
              >
                Agregar al carrito
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
