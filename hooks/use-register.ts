import { register } from '@/actions/auth/register';
import { login } from '@/actions/auth/login';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema } from '@/schemas/auth';
import { useToast } from '@/hooks/use-toast';
import type { z } from 'zod';

export function useRegisterForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      eventType: 'wedding',
    },
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('registerEmail');
    if (savedEmail) {
      form.setValue('email', savedEmail);
    }
  }, [form]);

  async function handleRegister(values: z.infer<typeof RegisterSchema>) {
    setIsLoading(true);
    const validatedFields = RegisterSchema.safeParse(values);

    if (validatedFields.success) {
      let response = await register(validatedFields.data);

      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error al registrar usuario.',
          description: response.error,
        });

        setIsLoading(false);
        return null;
      }

      response = await login(
        validatedFields.data,
        'credentials',
        '/onboarding'
      );

      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error al iniciar sesión.',
          description: response.error,
        });

        setIsLoading(false);
        return null;
      }
    }

    setIsLoading(false);
  }

  return {
    form,
    isPasswordVisible,
    setIsPasswordVisible,
    handleRegister,
    isLoading,
  };
}