import * as React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { bankEntitiesPY } from '@/lib/bank-entities-py';
import { BankDetailsFormSchema } from '@/schemas/dashboard';
//import { updateBankDetails } from '@/actions/data/bank-details';
import { BankDetails } from '@prisma/client';
import IdentificationNumberField from '@/components/forms/common/identification-number-field-input';
interface BankDetailsFormProps {
  eventId: string | undefined;
  bankDetails?: BankDetails | null;
}

export default function DashboardBankDetailsUpdateForm({
  eventId,
  bankDetails,
}: BankDetailsFormProps) {
  const form = useForm({
    resolver: zodResolver(BankDetailsFormSchema),
    defaultValues: {
      eventId: eventId ?? '',
      bankName: bankDetails?.bankName ?? '',
      accountHolder: bankDetails?.accountHolder ?? '',
      accountNumber: bankDetails?.accountNumber ?? '',
      accountType: bankDetails?.accountType ?? 'pyg',
      identificationType: bankDetails?.identificationType ?? 'ci',
      identificationNumber: bankDetails?.identificationNumber ?? '',
      razonSocial: bankDetails?.razonSocial ?? '',
      ruc: bankDetails?.ruc ?? '',
    },
  });

  const { formState } = form;
  const [isLoading, setIsLoading] = React.useState(false);

  const onSubmit = async (values: z.infer<typeof BankDetailsFormSchema>) => {
    setIsLoading(true);
    console.log(values);
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-8"
      >
        <div className="flex gap-2">
          <div className="w-full">
            <FormField
              control={form.control}
              name="accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre y apellido</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Crisley Dominguez"
                      className="!mt-1.5"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>
          <div className="w-full">
            <FormField
              control={form.control}
              name="identificationType"
              render={({ field }) => (
                <FormItem className="w-full">
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
                      <SelectItem value="ci">
                        <span className="font-semibold">CI - </span>Cédula de
                        Identidad
                      </SelectItem>
                      <SelectItem value="ruc">
                        <span className="font-semibold">RUC - </span>
                        Registro Único del Contribuyente
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>
          <div className="w-full">
            <FormField
              name="identificationNumber"
              control={form.control}
              render={({ field }) => (
                <IdentificationNumberField
                  field={{
                    ...field,
                    value: field.value || '',
                  }}
                />
              )}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="w-full">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem className="w-full">
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
          </div>
          <div className="w-full">
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
          </div>
          <div className="w-full">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem className="w-full">
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
                      <SelectItem value="pyg">
                        <span className="font-semibold">PYG - </span>
                        Guaraníes
                      </SelectItem>
                      <SelectItem value="usd">
                        <span className="font-semibold">USD - </span>Dolares
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="razonSocial"
          render={({ field }) => (
            <FormItem className="max-w-sm">
              <FormLabel>Razón social</FormLabel>
              <FormControl>
                <Input placeholder="Nombre y apellido" className="!mt-1" {...field} />
              </FormControl>
              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <Button type="submit" variant="success" className="w-64 mt-6">
          Guardar
        </Button>
      </form>
    </Form>
  );
}
