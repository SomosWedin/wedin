'use client'

import type { EventType } from '@prisma/client'
import { type BaseSyntheticEvent, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import EventTypeMultiSelect from '@/components/forms/common/event-type-multi-select'
import GiftMultiSelect, {
  type GiftMultiSelectOption,
} from '@/components/forms/common/gift-multi-select'
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
import { filterByEventTypeIds } from '@/lib/event-type-compatibility'
import type { AdminGiftlistValues } from '@/schemas/form'

type GiftlistFormProps = {
  form: UseFormReturn<AdminGiftlistValues>
  gifts: GiftMultiSelectOption[]
  loading: boolean
  isValid: boolean
  submitLabel: string
  eventTypes?: EventType[]
  filterGiftsByEventType?: boolean
  initialEventTypeIds?: string[]
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
  onCancel: () => void
}

export default function GiftlistForm({
  form,
  gifts,
  loading,
  isValid,
  submitLabel,
  eventTypes = [],
  filterGiftsByEventType = false,
  initialEventTypeIds = [],
  onSubmit,
  onCancel,
}: GiftlistFormProps) {
  const [eventTypeIds, setEventTypeIds] = useState(initialEventTypeIds)
  const availableGifts = filterGiftsByEventType
    ? filterByEventTypeIds(gifts, eventTypeIds)
    : gifts

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
        {filterGiftsByEventType && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Tipos de evento</span>
            <EventTypeMultiSelect
              eventTypes={eventTypes}
              selectedIds={eventTypeIds}
              onChange={values => {
                setEventTypeIds(values)
                const compatibleIds = new Set(
                  filterByEventTypeIds(gifts, values).map(gift => gift.id)
                )
                form.setValue(
                  'giftIds',
                  form
                    .getValues('giftIds')
                    .filter(giftId => compatibleIds.has(giftId)),
                  { shouldDirty: true, shouldValidate: true }
                )
              }}
            />
            <p className="text-xs text-textTertiary">
              Solo se mostrarán regalos compatibles con todos los tipos de
              evento seleccionados.
            </p>
          </div>
        )}
        <FormField
          control={form.control}
          name="giftIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regalos</FormLabel>
              <FormControl>
                <GiftMultiSelect
                  gifts={availableGifts}
                  selectedIds={field.value}
                  onChange={field.onChange}
                  disabled={filterGiftsByEventType && eventTypeIds.length === 0}
                />
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
