'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { StepTwoValues } from '@/hooks/onboarding/use-step-two';
import illustration from '@/public/assets/onb-step-two-icon.svg';
import { EventType } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import type { BaseSyntheticEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';

type StepTwoFormProps = {
  form: UseFormReturn<StepTwoValues>;
  eventType: EventType;
  isValid: boolean;
  loading: boolean;
  onSubmit: (
    event?: BaseSyntheticEvent
  ) => Promise<void>;
};

export default function StepTwoForm({
  form,
  eventType,
  isValid,
  loading,
  onSubmit,
}: StepTwoFormProps) {
  return (
    <Form {...form}>
      <form
        onSubmit={onSubmit}
        className="flex w-full flex-col gap-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tu nombre</FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    placeholder="John"
                    className="!mt-1.5"
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
                    {...field}
                    placeholder="Doe"
                    className="!mt-1.5"
                  />
                </FormControl>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="hidden" {...field} />
                </FormControl>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />
        </div>

        {eventType === EventType.WEDDING && (
          <>
            <div className="flex w-full items-center gap-2">
              <div className="-mt-6 h-full w-full border-b border-gray200" />

              <Image
                src={illustration}
                alt="illustration"
                width={42}
              />

              <div className="-mt-6 h-full w-full border-b border-gray200" />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <FormField
                control={form.control}
                name="partnerName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>
                      El nombre de tu pareja
                    </FormLabel>

                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Jane"
                        className="!mt-1.5"
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
                    <FormLabel>
                      El apellido de tu pareja
                    </FormLabel>

                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Doe"
                        className="!mt-1.5"
                      />
                    </FormControl>

                    <FormMessage className="font-normal text-red-600" />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        <div className="flex justify-center">
          <Button
            type="submit"
            variant="success"
            className="mt-6 w-72"
            disabled={loading || !isValid}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Continuar'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
