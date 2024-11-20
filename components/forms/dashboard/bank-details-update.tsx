'use client';

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
import { Button } from '@/components/ui/button';
import { bankEntitiesPY } from '@/lib/bank-entities-py';
import IdentificationNumberField from '@/components/forms/common/identification-number-field-input';
import { BankDetails } from '@prisma/client';
import { useUpdateBankDetails } from '@/hooks/dashboard/useUpdateBankDetails';
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-8"
      >
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="accountHolder"
            render={({ field }) => (
              <FormItem className="w-full">
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

          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem className="w-full">
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
