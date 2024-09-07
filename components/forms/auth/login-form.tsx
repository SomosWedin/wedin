'use client';

// import { login } from '@/actions/auth/login';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoginSchema } from '@/schemas/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import type { z } from 'zod';

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // // Setup debouncing for email input changes
  // const handleEmailSearch = async (email: string) => {
  //   const response = await fetch(`/api/users?email=${email}`);
  // };
  //
  // // useDebounceCallback to delay the handleEmailSearch execution
  // const debounce = useDebounceCallback(value => handleEmailSearch(value), 1000);
  //
  // // This function is triggered on every input change
  // function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
  //   debounce(e.target.value);
  // }

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleLogin(values: z.infer<typeof LoginSchema>) {
    setIsLoading(true);
    const validatedFields = LoginSchema.safeParse(values);

    if (validatedFields.success) {
    //   const response = await login(validatedFields.data, 'credentials');

    //   if (response?.error) {
    //     toast({
    //       variant: 'destructive',
    //       description: response.error,
    //     });
    //   }
    }
    setIsLoading(false);
  }

  // we might need to get rid of the form in order to introduce
  // start login by magic link
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className="flex flex-col gap-8 w-full max-w-xl"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="tucorreo@wedin.app"
                      className="!mt-1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>

          {/* <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <Input
                        {...field}
                        type={isPasswordVisible ? 'text' : 'password'}
                        placeholder="TuContraseña!52419$"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="ml-[-32px]"
                      >
                        {isPasswordVisible ? (
                          <IoEyeOffOutline size={20} />
                        ) : (
                          <IoEyeOutline size={20} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div> */}

          <Button variant="login" >
            Iniciar sesión
          </Button>
        </div>

        {/* <div className="flex flex-col gap-2">
          <Link
            href="/password-reset"
            className="flex justify-start text-secondaryTextColor"
          >
            <span className="text-indigo-600">Se me olvidó la contraseña</span>
          </Link>
        </div> */}
      </form>
    </Form>
  );
}
