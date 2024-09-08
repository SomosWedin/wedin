import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { login, checkUserExists } from '@/actions/auth/login';
import { LoginSchema } from '@/schemas/auth';
import type { z } from 'zod';
import { useRouter } from 'next/navigation';
import debounce from 'lodash.debounce';

export function useLoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const router = useRouter();

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

  const checkUser = async (email: string) => {
    const exists = await checkUserExists(email);
    if (exists) {
      setUserExists(true);
    } else {
      router.push('/register');
        localStorage.setItem('registerEmail', email);
    }
  };

  const debouncedCheckUser = debounce(checkUser, 2000);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
        if (name === 'email' && value.email) {
            debouncedCheckUser(value.email);
          }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

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
    userExists,
  };
}