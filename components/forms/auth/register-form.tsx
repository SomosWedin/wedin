'use client'

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
import AuthFormButton from './auth-form-button';

export default function RegisterForm() {
  const {
    form,
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
        </div>
        <AuthFormButton label="Crear cuenta" isLoading={isLoading} />
      </form>
    </Form>
  );
}
