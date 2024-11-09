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
import { Loader2 } from 'lucide-react';
import { FaCheck } from 'react-icons/fa6';

type DashboardEventSettingsFormProps = {
  event: Event;
  currentUser: User;
};

export default function DashboardEventSettingsForm({
  event,
  currentUser,
}: DashboardEventSettingsFormProps) {
  const { loading, form, onSubmit, isDirty } = useUpdateEventAndUserData({
    event,
    currentUser,
  });

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

        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tu nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Santiago"
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
                    placeholder="Figueiredo"
                    className="!mt-1.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <div className="w-full flex flex-col h-full justify-end gap-2.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder={currentUser.email ? currentUser.email : ''}
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
                      placeholder="Crisley"
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
              name="partnerLastName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>El apellido de tu pareja</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Dominguez"
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
              name="partnerEmail"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Email de tu pareja</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="crisley@wedin.app"
                      className="!mt-1.5"
                      {...field}
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
    </Form>
  );
}
