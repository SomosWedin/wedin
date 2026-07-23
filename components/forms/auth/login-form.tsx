'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLoginForm } from '@/hooks/use-login';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
  const { form, handleLogin, isLoading } = useLoginForm();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className="flex w-full max-w-xl flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>

              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  placeholder="tucorreo@wedin.app"
                  className="!mt-1"
                  disabled={isLoading}
                />
              </FormControl>

              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="success"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando enlace...
            </>
          ) : (
            'Continuar con email'
          )}
        </Button>
      </form>
    </Form>
  );
}
