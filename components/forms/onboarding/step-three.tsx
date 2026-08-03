'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
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
  type StepThreeValues,
  useStepThree,
} from '@/hooks/onboarding/use-step-three'
import { countries } from '@/lib/countries'

type StepThreeFormProps = {
  loading: boolean
  onSubmit: (values: StepThreeValues) => Promise<void> | void
}

export default function StepThreeForm({
  loading,
  onSubmit,
}: StepThreeFormProps) {
  const {
    form,
    handleSubmit,
    isButtonEnabled,
    isDecidingEventLocation,
    handleDecidingChange,
  } = useStepThree({ onSubmit })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {isDecidingEventLocation ? (
            <div className="w-full">
              <Label htmlFor="disabled-event-country">País</Label>

              <Input
                id="disabled-event-country"
                placeholder="Elegí un país"
                disabled
                className="!mt-1.5"
              />
            </div>
          ) : (
            <FormField
              control={form.control}
              name="eventCountry"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>País</FormLabel>

                  <FormControl className="!mt-1">
                    <Combobox
                      options={countries}
                      placeholder="Elegí un país"
                      selected={field.value ?? ''}
                      onChange={field.onChange}
                      width="w-60"
                    />
                  </FormControl>

                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="eventCity"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Ciudad</FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    placeholder="San Bernardino"
                    disabled={isDecidingEventLocation}
                    className="!mt-1.5"
                  />
                </FormControl>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isDecidingEventLocation"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  id="is-deciding-event-location"
                  checked={field.value}
                  onCheckedChange={handleDecidingChange}
                />
              </FormControl>

              <FormLabel
                htmlFor="is-deciding-event-location"
                className="!m-0 cursor-pointer text-base font-normal"
              >
                Aún estamos decidiendo
              </FormLabel>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-6 flex justify-center">
          <Button
            type="submit"
            variant="success"
            disabled={loading || !isButtonEnabled}
            className="w-72"
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
  )
}
