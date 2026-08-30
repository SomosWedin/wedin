'use client'

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
import type { AdminGiftlistValues } from '@/schemas/form'

type GiftlistFormProps = {
  form: UseFormReturn<AdminGiftlistValues>
  loading: boolean
  isValid: boolean
  submitLabel: string
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
  onCancel: () => void
}

export default function GiftlistForm({
  form,
  loading,
  isValid,
  submitLabel,
  onSubmit,
  onCancel,
}: GiftlistFormProps) {
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
                <Input {...field} placeholder="Esenciales del hogar" />
              </FormControl>
              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={loading || !isValid}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
