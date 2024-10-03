import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import OnboardingStepper from './stepper';
import wedinIcon from '@/public/w-icon.svg';
import Image from 'next/image';
import { useOnbStepFour } from '@/hooks/onboarding/use-onb-step-four';

export default function StepFour() {
  const { form, loading, onSubmit, isDeciding, handleIsDecidingEventDate, isButtonEnabled } = useOnbStepFour();

  return (
    <div className="relative flex flex-col justify-center items-center gap-8 h-full">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-textSecondary text-2xl font-medium">
          ¿Cuándo tendrá lugar este gran día?
        </h1>
        <p className="text-secondary400">
          Configura tu sitio web para esta fecha especial
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-8"
        >
          <div className="flex flex-col gap-4">
            {!isDeciding ? (
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Fecha</FormLabel>
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
                      <PopoverContent
                        className="p-0 w-auto bg-white"
                        align="end"
                      >
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
            ) : (
              <div className="w-full flex flex-col gap-3 pt-1.5">
                <FormLabel>Fecha</FormLabel>
                <Button
                  disabled
                  variant={'outline'}
                  className={cn(
                    'w-full pl-3 text-left font-normal text-[#94A3B8]'
                  )}
                >
                  <span className="text-[#94A3B8]">dd/mm/aa</span>
                  <CalendarIcon className="ml-auto w-4 h-4 opacity-50" />
                </Button>
              </div>
            )}
            <FormField
              control={form.control}
              name="isDecidingEventDate"
              render={({ field }) => (
                <FormItem className="flex gap-2 items-center">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={checked => {
                        field.onChange(checked);
                        handleIsDecidingEventDate(checked);
                      }}
                    />
                  </FormControl>
                  <div className="!m-0">
                    <FormLabel className="text-sm font-normal cursor-pointer sm:text-base">
                      Aún estamos decidiendo
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-center">
            <Button
              type="submit"
              variant="success"
              disabled={loading || !isButtonEnabled}
              className="w-72"
            >
              Continuar
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            </Button>
          </div>
        </form>
      </Form>

      <OnboardingStepper step={4} />
    </div>
  );
}
