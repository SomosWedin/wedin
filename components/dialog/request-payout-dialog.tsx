'use client';

import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import PriceInput from '@/components/forms/common/price-input';
import { usePayout } from '@/hooks/dashboard/use-payout';

const createRequestPayoutSchema = (balance: number) =>
  z.object({
    amount: z
      .string()
      .min(1, { message: 'Ingresá un monto' })
      .refine(value => Number(value) > 0 && Number(value) <= balance, {
        message: `El monto debe ser mayor a 0 y no superar Gs. ${balance.toLocaleString(
          'es-PY'
        )}`,
      }),
  });

type RequestPayoutDialogProps = {
  eventId: string;
  balance: number;
};

export default function RequestPayoutDialog({
  eventId,
  balance,
}: RequestPayoutDialogProps) {
  const [open, setOpen] = useState(false);
  const { loading, requestPayout } = usePayout();
  const requestPayoutSchema = createRequestPayoutSchema(balance);

  const form = useForm<z.infer<typeof requestPayoutSchema>>({
    resolver: zodResolver(requestPayoutSchema),
    mode: 'all',
    defaultValues: { amount: '' },
  });
  const { isValid } = form.formState;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) form.reset({ amount: '' });
  };

  const onSubmit: SubmitHandler<
    z.infer<typeof requestPayoutSchema>
  > = async values => {
    const response = await requestPayout(eventId, values);
    if (!response.error) handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="success"
          className="gap-2"
          disabled={balance <= 0}
        >
          Retirar efectivo
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Retirar efectivo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-textTertiary">
              Disponible para retiro: Gs. {balance.toLocaleString('es-PY')}
            </p>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a retirar</FormLabel>
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

            <div className="flex gap-2 justify-end pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={loading || !isValid}
              >
                Confirmar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
