import * as React from 'react';
// import { useQuery } from '@tanstack/react-query';
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
import { Calendar } from '@/components/ui/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { EventUserUpdateSchema } from '@/schemas/dashboard';
import { getEvent } from '@/actions/data/event';
import { Event, User } from '@prisma/client';

interface EventUserUpdateFormProps {
  event: Event | null;
  currentUser: User | null;
}

export default function DashboardEventUserUpdateForm({ event, currentUser }: EventUserUpdateFormProps) {
  const form = useForm<z.infer<typeof EventUserUpdateSchema>>({
    resolver: zodResolver(EventUserUpdateSchema),
    defaultValues: {
      eventDate: event?.date ?? undefined,
      name: currentUser?.name ?? '',
      lastName: currentUser?.lastName ?? '',
      partnerName: event?.partnerName ?? '',
      partnerLastName: '',
      partnerEmail: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof EventUserUpdateSchema>) => {
    console.log(values);
  };

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
              <FormLabel>Fecha del evento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
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
          <div className="w-full">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
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
          </div>
          <div className="w-full">
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
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
          </div>
          <div className="w-full">
            <div className="flex flex-col h-full justify-end gap-2.5">
              <Label>Email</Label>
              <Input type="email" placeholder="ale@wedin.app" disabled />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="w-full">
            <FormField
              control={form.control}
              name="partnerName"
              render={({ field }) => (
                <FormItem>
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
          </div>
          <div className="w-full">
            <FormField
              control={form.control}
              name="partnerLastName"
              render={({ field }) => (
                <FormItem>
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
          </div>
          <div className="w-full">
            <FormField
              control={form.control}
              name="partnerEmail"
              render={({ field }) => (
                <FormItem>
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
        </div>
        <Button type="submit" variant="success" className="w-64 mt-6">
          Guardar
        </Button>
      </form>
    </Form>
  );
}
