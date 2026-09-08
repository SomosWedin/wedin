'use client'

import { format, startOfToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import OnboardingBackButton from '@/components/onboarding/back-button'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  type StepFourValues,
  useStepFour,
} from '@/hooks/onboarding/use-step-four'
import { cn } from '@/lib/utils'

type StepFourFormProps = {
  defaultValues: StepFourValues
  loading: boolean
  onBack: () => void
  onSubmit: (values: StepFourValues) => Promise<void>
}

export default function StepFourForm({
  defaultValues,
  loading,
  onBack,
  onSubmit,
}: StepFourFormProps) {
  const {
    form,
    eventDate,
    isCalendarOpen,
    isDecidingEventDate,
    isButtonEnabled,
    handleCalendarOpenChange,
    handleDateChange,
    handleDecidingChange,
    handleSubmit,
  } = useStepFour({ defaultValues, onSubmit })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="eventDate"
            render={() => (
              <FormItem className="w-full">
                <FormLabel>Fecha</FormLabel>

                <Popover
                  open={!isDecidingEventDate && isCalendarOpen}
                  onOpenChange={handleCalendarOpenChange}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isDecidingEventDate}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !eventDate && 'text-[#94A3B8]'
                        )}
                      >
                        {eventDate ? (
                          format(eventDate, 'PPP', {
                            locale: es,
                          })
                        ) : (
                          <span>dd/mm/aa</span>
                        )}

                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto bg-white p-0" align="end">
                    <Calendar
                      locale={es}
                      mode="single"
                      selected={eventDate}
                      onSelect={handleDateChange}
                      disabled={date => date < startOfToday()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDecidingEventDate"
            render={() => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={isDecidingEventDate}
                    onCheckedChange={handleDecidingChange}
                  />
                </FormControl>

                <FormLabel className="!m-0 cursor-pointer text-sm font-normal sm:text-base">
                  Aún estamos decidiendo
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-center">
          <div className="flex w-72 items-center gap-3">
            <OnboardingBackButton onClick={onBack} disabled={loading} />

            <Button
              type="submit"
              variant="success"
              disabled={loading || !isButtonEnabled}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Continuar'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
