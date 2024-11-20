'use client';

import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { BankDetailsFormSchema } from '@/schemas/dashboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { BankDetails } from '@prisma/client';
import { updateBankDetails } from '@/actions/data/bank-details';

type useUpdateBankDetailsProps = {
  eventId: string;
  bankDetails: BankDetails | null;
};

export function useUpdateBankDetails({
  eventId,
  bankDetails,
}: useUpdateBankDetailsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof BankDetailsFormSchema>>({
    resolver: zodResolver(BankDetailsFormSchema),
    mode: 'all',
    defaultValues: {
      eventId: eventId,
      bankName: bankDetails?.bankName || '',
      accountHolder: bankDetails?.accountHolder || '',
      accountNumber: bankDetails?.accountNumber || '',
      accountType: bankDetails?.accountType || 'pyg',
      identificationType: bankDetails?.identificationType || 'ci',
      identificationNumber: bankDetails?.identificationNumber || '',
      razonSocial: bankDetails?.razonSocial || '',
      ruc: bankDetails?.ruc || '',
    },
  });
  const { isDirty, isValid } = form.formState;

  const onSubmit: SubmitHandler<
    z.infer<typeof BankDetailsFormSchema>
  > = async values => {
    setLoading(true);

    const validatedFields = BankDetailsFormSchema.safeParse(values);

    if (!validatedFields.success) {
      console.log(validatedFields.error.errors);
      toast({
        title: 'Error en los campos del formulario',
        description: validatedFields.error.errors
          .map(err => err.message)
          .join(', '),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await updateBankDetails(values);

      if (!response.success) {
        toast({
          title: 'Error al actualizar los datos bancarios',
          description: response.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Los datos bancarios se actualizaron con éxito. 📅',
      });
      setLoading(false);
    } catch (error) {
      console.error('Error updating event and user data:', error);
      return;
    }
  };

  return {
    loading,
    form,
    isDirty,
    isValid,
    onSubmit,
  };
}
