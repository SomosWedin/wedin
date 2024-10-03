'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { useLoginForm } from '@/hooks/use-login';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
  const {
    form,
    isPasswordVisible,
    setIsPasswordVisible,
    handleLogin,
    isLoading,
    userExists,
  } = useLoginForm();
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className="flex flex-col gap-6 w-full max-w-xl"
      >
        <div className="flex flex-col gap-4">
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

          {userExists && (
            <>
              <div className="flex flex-col gap-2">
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
                            className="!-mt-1"
                            type={isPasswordVisible ? 'text' : 'password'}
                            placeholder="Password!52419$"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setIsPasswordVisible(!isPasswordVisible)
                            }
                            className="-ml-8 h-4 mt-1.5"
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
                <div className="flex justify-end">
                  <Link
                    href="/password-reset"
                    className="text-textTertiary text-sm hover:opacity-70 hover:underline transition-opacity"
                  >
                    Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>
              <Button type="submit" variant="success" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
