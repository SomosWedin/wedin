'use client';

import { updateEventUrl } from '@/actions/data/event';
import { useToast } from '@/hooks/use-toast';
import { EventUrlFormSchema } from '@/schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';

type UseEventUrlProps = {
  eventId: string;
  url: string | null;
};

export function useEventUrl({ eventId, url }: UseEventUrlProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof EventUrlFormSchema>>({
    resolver: zodResolver(EventUrlFormSchema),
    mode: 'all',
    defaultValues: {
      eventId,
      eventUrl: url ?? '',
    },
  });
  const { isDirty, isValid } = form.formState;

  const onSubmit: SubmitHandler<
    z.infer<typeof EventUrlFormSchema>
  > = async values => {
    setLoading(true);

    const result = await updateEventUrl(values.eventId, values.eventUrl);

    if ('error' in result) {
      toast({ title: result.error, variant: 'destructive' });
      setLoading(false);
      return;
    }

    toast({ title: 'La dirección de tu evento se actualizó con éxito. 🔗' });
    form.reset({ eventId, eventUrl: values.eventUrl });
    setLoading(false);
  };

  return {
    form,
    isDirty,
    isValid,
    loading,
    onSubmit,
  };
}
