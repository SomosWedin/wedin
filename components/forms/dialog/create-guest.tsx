'use client'

import { Loader2 } from 'lucide-react'
import type { BaseSyntheticEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
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
import type { CreateGuestFormValues } from '@/hooks/dialog/forms/use-create-guest'

type CreateGuestFormProps = {
  form: UseFormReturn<CreateGuestFormValues>
  loading: boolean
  isValid: boolean
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
  onCancel: () => void
}

export default function CreateGuestForm({
  form,
  loading,
  isValid,
  onSubmit,
  onCancel,
}: CreateGuestFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>

              <FormControl>
                <Input {...field} placeholder="María Pérez" />
              </FormControl>

              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>

              <FormControl>
                <Input
                  {...field}
                  type="tel"
                  inputMode="numeric"
                  placeholder="0981234567"
                />
              </FormControl>

              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <div className="-mx-6 -mb-6 flex justify-end gap-2 rounded-b-lg bg-gray-50 px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="success"
            className="gap-2"
            disabled={loading || !isValid}
          >
            Agregar invitado
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </form>
    </Form>
  )
}
