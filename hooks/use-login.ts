import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/actions/auth/login';
import { LoginSchema } from '@/schemas/auth';
import type { z } from 'zod';

export function useLoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof LoginSchema>) => login(values, 'credentials'),
    onSuccess: (data) => {
      console.log("data:", data)
    },
    onError: (error) => {
        console.log("error:", error)
    },
  });

  const handleLogin = async (values: z.infer<typeof LoginSchema>) => {
    const validatedFields = LoginSchema.safeParse(values);
    if (validatedFields.success) {
      mutation.mutate(validatedFields.data);
    }
  };

  return {
    form,
    isPasswordVisible,
    setIsPasswordVisible,
    handleLogin,
    isLoading: mutation.isPending,
  };
}