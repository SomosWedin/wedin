import { login, type LoginValues } from '@/actions/auth/login';
import { useToast } from '@/hooks/use-toast';
import { MagicLoginSchema } from '@/schemas/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

export function useLoginForm() {
  const { toast } = useToast();

  const form = useForm<LoginValues>({
    resolver: zodResolver(MagicLoginSchema),
    defaultValues: {
      email: '',
    },
  });

  const mutation = useMutation({
    mutationFn: login,

    onSuccess: result => {
      if (result.error) {
        toast({
          variant: 'destructive',
          description: result.error,
        });

        return;
      }

      toast({
        variant: 'success',
        description: result.success,
      });
    },

    onError: () => {
      toast({
        variant: 'destructive',
        description: 'Ocurrió un error. Intentá nuevamente.',
      });
    },
  });

  const handleLogin = (values: LoginValues) => {
    mutation.mutate({
      email: values.email.trim().toLowerCase(),
    });
  };

  return {
    form,
    handleLogin,
    isLoading: mutation.isPending,
  };
}
