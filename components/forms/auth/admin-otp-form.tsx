'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAdminOtp } from '@/hooks/use-admin-otp'

type AdminOtpFormProps = {
  maskedEmail: string
}

export default function AdminOtpForm({ maskedEmail }: AdminOtpFormProps) {
  const {
    form,
    hasRequested,
    cooldown,
    handleRequest,
    handleVerify,
    isRequesting,
    isVerifying,
  } = useAdminOtp()

  if (!hasRequested) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-center text-textTertiary">
          Te enviaremos un código de acceso a{' '}
          <span className="font-semibold text-textPrimary">{maskedEmail}</span>.
        </p>

        <Button
          type="button"
          variant="success"
          onClick={handleRequest}
          disabled={isRequesting}
        >
          {isRequesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando código...
            </>
          ) : (
            'Enviarme el código'
          )}
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleVerify)}
        className="flex w-full max-w-sm flex-col gap-6"
      >
        <p className="text-center text-textTertiary">
          Ingresá el código de 6 dígitos que enviamos a{' '}
          <span className="font-semibold text-textPrimary">{maskedEmail}</span>.
          Vence en 10 minutos.
        </p>

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de acceso</FormLabel>

              <FormControl>
                <Input
                  {...field}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="000000"
                  className="!mt-1 text-center text-2xl font-semibold tracking-[0.5em]"
                  disabled={isVerifying}
                  onChange={event =>
                    field.onChange(event.target.value.replace(/\D/g, ''))
                  }
                />
              </FormControl>

              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <Button type="submit" variant="success" disabled={isVerifying}>
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            'Entrar al panel'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={handleRequest}
          disabled={isRequesting || cooldown > 0}
        >
          {cooldown > 0
            ? `Reenviar código en ${cooldown}s`
            : 'Reenviar el código'}
        </Button>
      </form>
    </Form>
  )
}
