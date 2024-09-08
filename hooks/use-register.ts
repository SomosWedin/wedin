import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { register } from '@/actions/auth/register';
import { RegisterSchema } from '@/schemas/auth';
import type { z } from 'zod';

export function useRegisterForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      eventType: 'wedding',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof RegisterSchema>) => register(values),
    onSuccess: (data) => {
      console.log("data:", data);
    },
    onError: (error) => {
      console.log("error:", error);
    },
  });

  const handleRegister = async (values: z.infer<typeof RegisterSchema>) => {
    const validatedFields = RegisterSchema.safeParse(values);
    if (validatedFields.success) {
      mutation.mutate(validatedFields.data);
    }
  };

  return {
    form,
    isPasswordVisible,
    setIsPasswordVisible,
    handleRegister,
    isLoading: mutation.isPending,
  };
}