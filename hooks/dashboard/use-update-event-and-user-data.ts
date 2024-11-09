'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { updateEvent } from '@/actions/data/event';
import { updateUserById } from '@/actions/data/user';
import { SubmitHandler, useForm } from 'react-hook-form';
import { EventUserUpdateSchema } from '@/schemas/dashboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Event, User, EventType } from '@prisma/client';

type UseUpdateEventAndUserDataProps = {
  event: Event;
  currentUser: User;
};

export function useUpdateEventAndUserData({
  event,
  currentUser,
}: UseUpdateEventAndUserDataProps) {
  const [loading, setLoading] = useState(false);
  const { email, name, lastName } = currentUser;
  const { id, date, eventType, partnerName } = event;
  const { toast } = useToast();

  const form = useForm<z.infer<typeof EventUserUpdateSchema>>({
    resolver: zodResolver(EventUserUpdateSchema),
    defaultValues: {
      eventDate: date || undefined,
      name: name || '',
      lastName: lastName || '',
      partnerName: '',
      partnerLastName: '',
      partnerEmail: '',
    },
  });
  const { isDirty } = form.formState;

  const onSubmit: SubmitHandler<
    z.infer<typeof EventUserUpdateSchema>
  > = async values => {
    setLoading(true);

    try {
      await updateEvent(id, { date: values.eventDate });
      await updateUserById(currentUser.id, values.name, values.lastName);
      console.log('Event and user data updated');
    } catch (error) {
      console.error('Error updating event and user data:', error);
      return;
    }
  };

  return {
    loading,
    form,
    isDirty,
    onSubmit,
  };
}
