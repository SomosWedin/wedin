'use client'

import { type Event, type User } from '@prisma/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { FaCheck } from 'react-icons/fa6'
import UnsavedChangesDialog from '@/components/dialog/unsaved-changes-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUpdateEventSettings } from '@/hooks/dashboard/forms/use-update-event-settings'
import { isWeddingEventType } from '@/lib/event-type'
import { cn } from '@/lib/utils'

type DashboardEventSettingsFormProps = {
  event: Event & { eventType: { key: string } | null }
  currentUser: User
  secondaryEventUser: User | null
}

export default function DashboardEventSettingsForm({
  event,
  currentUser,
  secondaryEventUser,
}: DashboardEventSettingsFormProps) {
  const { loading, form, onSubmit, onInvalid, isDirty } =
    useUpdateEventSettings({
      event,
      currentUser,
      secondaryEventUser,
    })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="w-full flex flex-col gap-8"
      >
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-2">
          <FormField
            control={form.control}
            name="eventUrl"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Dirección de tu evento</FormLabel>

                <div className="!mt-0 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
                  <FormControl>
                    <div className="mt-1.5 flex min-w-0 flex-1 items-center rounded-md border border-input bg-white focus-within:ring-1 focus-within:ring-ring !max-h-[40px]">
                      <Input
                        {...field}
                        placeholder="bodamariayjuan"
                        aria-label="Subdominio del evento"
                        className="min-w-0 flex-1 border-0 bg-transparent !mt-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />

                      <span className="whitespace-nowrap pr-3 text-sm text-textTertiary select-none">
                        .somoswedin.com
                      </span>
                    </div>
                  </FormControl>
                </div>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="mb-[-10px]">Fecha del evento</FormLabel>
                <Popover
                  open={isDatePickerOpen}
                  onOpenChange={setIsDatePickerOpen}
                >
                  <PopoverTrigger asChild>
                    <FormControl className="!mt-1.5">
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-[#94A3B8]'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: es })
                        ) : (
                          <span className="text-[#94A3B8]">dd/mm/aa</span>
                        )}
                        <CalendarIcon className="ml-auto w-4 h-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto bg-white" align="end">
                    <Calendar
                      key={isDatePickerOpen ? 'open' : 'closed'}
                      locale={es}
                      mode="single"
                      defaultMonth={field.value}
                      selected={field.value}
                      onSelect={date => {
                        field.onChange(date)
                        setIsDatePickerOpen(false)
                      }}
                      disabled={date => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tu nombre</FormLabel>
                <FormControl>
                  <Input placeholder="John" className="!mt-1.5" {...field} />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tu apellido</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" className="!mt-1.5" {...field} />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <div className="w-full flex flex-col gap-2.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder={currentUser.email || ''}
              disabled
            />
          </div>
        </div>

        {isWeddingEventType(event.eventType) && (
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-2">
            <FormField
              control={form.control}
              name="partnerName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>El nombre de tu pareja</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jane"
                      className="!mt-1.5"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partnerLastName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>El apellido de tu pareja</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Smith"
                      className="!mt-1.5"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partnerEmail"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Email de tu pareja</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="correodetupareja@ejemplo.com"
                      className="!mt-1.5"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="justify-start w-full mt-6">
          <Button
            type="submit"
            variant="success"
            className="gap-2 w-60"
            disabled={loading || !isDirty}
          >
            Guardar
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FaCheck className="text-lg" />
            )}
          </Button>
        </div>
      </form>

      <UnsavedChangesDialog hasUnsavedChanges={isDirty} />
    </Form>
  )
}
