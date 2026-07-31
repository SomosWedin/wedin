'use client';

import React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Event, User, EventType } from '@prisma/client';
import { useUpdateEventAndUserData } from '@/hooks/dashboard/use-update-event-and-user-data';
import { useEventUrl } from '@/hooks/dashboard/use-event-url';
import { Loader2 } from 'lucide-react';
import { FaCheck } from 'react-icons/fa6';

type DashboardEventSettingsFormProps = {
  event: Event;
  currentUser: User;
  secondaryEventUser?: User | null;
};

export default function DashboardEventSettingsForm({
  event,
  currentUser,
  secondaryEventUser,
}: DashboardEventSettingsFormProps) {
  const { loading, form, onSubmit, isDirty, isValid } =
    useUpdateEventAndUserData({
      event,
      currentUser,
      secondaryEventUser,
    });

  const {
    form: urlForm,
    onSubmit: onUrlSubmit,
    isDirty: isUrlDirty,
    isValid: isUrlValid,
    loading: urlLoading,
  } = useEventUrl({ eventId: event.id, url: event.url });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-8"
      >
        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem className="max-w-sm">
              <FormLabel className="mb-[-10px]">Fecha del evento</FormLabel>
              <Popover>
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
                    locale={es}
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={date => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage className="font-normal text-red-600" />
            </FormItem>
          )}
        />

        <Form {...urlForm}>
          <FormField
            control={urlForm.control}
            name="eventUrl"
            render={({ field }) => (
              <FormItem className="w-full max-w-xl">
                <FormLabel>Dirección de tu evento</FormLabel>

                <div className="!mt-0 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
                  <FormControl>
                    <div className="mt-1.5 flex min-w-0 flex-1 items-center rounded-md border border-input bg-white focus-within:ring-1 focus-within:ring-ring">
                      <Input
                        {...field}
                        placeholder="amelie-y-john"
                        aria-label="Subdominio del evento"
                        className="min-w-0 flex-1 border-0 bg-transparent !mt-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />

                      <span className="whitespace-nowrap pr-3 text-sm text-textTertiary select-none">
                        .somoswedin
                      </span>
                    </div>
                  </FormControl>

                  <Button
                    type="button"
                    variant="success"
                    className="gap-2 sm:mt-1.5 sm:shrink-0"
                    disabled={
                      urlLoading ||
                      !isUrlDirty ||
                      !isUrlValid
                    }
                    onClick={urlForm.handleSubmit(onUrlSubmit)}
                  >
                    Guardar

                    {urlLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaCheck className="text-lg" />
                    )}
                  </Button>
                </div>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />
        </Form>

        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tu nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John"
                    className="!mt-1.5"
                    {...field}
                  />
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
                  <Input
                    placeholder="Doe"
                    className="!mt-1.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <div className="w-full flex flex-col h-full justify-end gap-2.5 mt-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder={currentUser.email || ''}
              disabled
            />
          </div>
        </div>

        {event.eventType === EventType.WEDDING && (
          <div className="flex gap-2">
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
            disabled={loading || !isDirty || !isValid}
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
    </Form>
  );
}
