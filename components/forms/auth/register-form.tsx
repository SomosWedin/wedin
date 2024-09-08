'use client';

import { useRegisterForm } from '@/hooks/use-register';
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
import AuthFormButton from './auth-form-button';

export default function RegisterForm() {
  const {
    form,
    isPasswordVisible,
    setIsPasswordVisible,
    handleRegister,
    isLoading,
  } = useRegisterForm();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleRegister)}
        className="flex flex-col gap-6 w-full max-w-xl"
      >
        <div className="flex flex-col gap-3">
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
                  <FormLabel>Crear contraseña</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <Input
                        {...field}
                        type={isPasswordVisible ? 'text' : 'password'}
                        className="!-mt-1"
                        placeholder="TuContraseña!52419$"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
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
          </div>

          <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirma tu contraseña</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <Input
                        {...field}
                        type={isPasswordVisible ? 'text' : 'password'}
                        className="!-mt-1"
                        placeholder="**********"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <AuthFormButton label="Registrarme" isLoading={isLoading} />
      </form>
    </Form>
  );
}
