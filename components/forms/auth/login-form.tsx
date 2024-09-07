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
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { useLoginForm } from '@/hooks/use-login';

export default function LoginForm() {
  const {
    form,
    isPasswordVisible,
    setIsPasswordVisible,
    handleLogin,
    isLoading,
  } = useLoginForm();
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
          </div>

          <Button variant="login" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Iniciar sesión'}
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
