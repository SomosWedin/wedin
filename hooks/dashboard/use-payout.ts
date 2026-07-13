'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestPayout as requestPayoutAction } from '@/actions/data/payout';
import { useToast } from '@/hooks/use-toast';
import type { RequestPayoutParams } from '@/schemas/params';
import type { z } from 'zod';

export function usePayout() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const requestPayout = async (
    eventId: string,
    values: z.infer<typeof RequestPayoutParams>
  ) => {
    setLoading(true);
    const response = await requestPayoutAction(eventId, values);

    if (response.error) {
      toast({
        title: 'Error al solicitar el retiro',
        description: response.error,
        variant: 'destructive',
      });
      setLoading(false);
      return response;
    }

    toast({ title: 'Solicitud de retiro enviada. 💸' });
    router.refresh();
    setLoading(false);
    return response;
  };

  return {
    loading,
    requestPayout,
  };
}
