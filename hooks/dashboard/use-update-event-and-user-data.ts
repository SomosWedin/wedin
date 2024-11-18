'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { updateEvent } from '@/actions/data/event';
import { updateUserById } from '@/actions/data/user';
import { SubmitHandler, useForm } from 'react-hook-form';
import { UpdateEventAndUserFormSchema } from '@/schemas/dashboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Event, User, EventType } from '@prisma/client';

type UseUpdateEventAndUserDataProps = {
  event: Event;
  currentUser: User;
  secondaryEventUser?: User;
};

export function useUpdateEventAndUserData({
  event,
  currentUser,
  secondaryEventUser,
}: UseUpdateEventAndUserDataProps) {
  console.log('event', secondaryEventUser);
  const [loading, setLoading] = useState(false);
  const { name, lastName } = currentUser;
  const { id, date, eventType } = event;
  const {
    id: partnerId,
    name: partnerName,
    lastName: partnerLastName,
    email: partnerEmail,
  } = secondaryEventUser || {};
  const { toast } = useToast();

  const form = useForm<z.infer<typeof UpdateEventAndUserFormSchema>>({
    // resolver: zodResolver(UpdateEventAndUserFormSchema),
    mode: 'all',
    defaultValues: {
      eventDate: date || undefined,
      eventType: eventType || '',
      name: name || '',
      lastName: lastName || '',
      partnerName: partnerName || '',
      partnerLastName: partnerLastName || '',
      partnerEmail: partnerEmail || '',
    },
  });
  const { isDirty, isValid } = form.formState;

  const onSubmit: SubmitHandler<
    z.infer<typeof UpdateEventAndUserFormSchema>
  > = async values => {
    console.log('values', values);
    setLoading(true);

    const validatedFields = UpdateEventAndUserFormSchema.safeParse(values);

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
      await updateEvent(id, { date: values.eventDate });
      await updateUserById(currentUser.id, values.name, values.lastName);
      if (partnerId) {
        await updateUserById(
          partnerId,
          values.partnerName,
          values.partnerLastName
        );
      }
      console.log('Event and user data updated');
    } catch (error) {
      console.error('Error updating event and user data:', error);
      return;
    }

    toast({
      title: 'El evento y usuario se actualizó con éxito. 📅',
    });
    setLoading(false);
  };

  return {
    loading,
    form,
    isDirty,
    isValid,
    onSubmit,
  };
}
