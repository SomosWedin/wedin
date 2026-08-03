'use client';

import IdentificationNumberField from '@/components/forms/common/identification-number-field-input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateBankDetails } from '@/hooks/dashboard/forms/use-update-bank-details';
import { bankEntitiesPY } from '@/lib/bank-entities-py';
import { BankDetails } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { FaCheck } from 'react-icons/fa6';

type BankDetailsFormProps = {
  eventId: string;
  bankDetails: BankDetails | null;
};

export default function DashboardBankDetailsUpdateForm({
  eventId,
  bankDetails,
}: BankDetailsFormProps) {
  const { loading, form, onSubmit, isDirty, isValid } = useUpdateBankDetails({
    eventId: eventId,
    bankDetails: bankDetails,
  });
  const identificationType = form.watch('identificationType');

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-8"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="accountHolder"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Nombre y apellido</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    className="!mt-1.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="identificationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de documento</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl className="!mt-1.5">
                    <SelectTrigger>
                      <SelectValue placeholder="Documento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="ci">CI</SelectItem>
                    <SelectItem value="ruc">RUC</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            name="identificationNumber"
            control={form.control}
            render={({ field }) => (
              <IdentificationNumberField
                field={{
                  ...field,
                  value: field.value || '',
                }}
                identificationType={identificationType}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Entidad</FormLabel>
                <FormControl className="!mt-1.5">
                  <Combobox
                    options={bankEntitiesPY}
                    placeholder="Elegí una entidad"
                    selected={field.value}
                    onChange={field.onChange}
                    width="w-96"
                  />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de cuenta</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej. 61920381"
                    className="!mt-1.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda de la cuenta</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl className="!mt-1.5">
                    <SelectTrigger>
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="pyg">PYG</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="razonSocial"
          render={({ field }) => (
            <FormItem className="max-w-sm">
              <FormLabel>Razón social</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nombre y apellido"
                  className="!mt-1.5"
                  {...field}
                />
              </FormControl>
              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <div className="justify-start w-full mt-6">
          <Button
            type="submit"
            variant="success"
            className="gap-2 w-60"
            disabled={loading || !isDirty || !isValid}
          >
            Guardar
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FaCheck className="text-lg" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
