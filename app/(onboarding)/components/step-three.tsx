import * as React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepThreeSchema } from '@/schemas/onboarding';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import { useSession } from 'next-auth/react';
import OnboardingStepper from './stepper';
import wedinIcon from '@/public/w-icon.svg';
import Image from 'next/image';
import { countries } from '@/lib/countries';

export default function StepThree() {
  const router = useRouter();
  const [isDeciding, setIsDeciding] = React.useState<boolean | string>(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { data: session, update } = useSession();

  const form = useForm<z.infer<typeof StepThreeSchema>>({
    resolver: zodResolver(StepThreeSchema),
    defaultValues: {
      isDecidingEventLocation: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof StepThreeSchema>) => {};

  const handleIsDecidingCountryCity = (value: boolean | string) => {
    setIsDeciding(value);
    if (value) {
      form.setValue('eventCountry', '');
      form.setValue('eventCity', '');
    }
  };

  return (
    <div className="relative flex flex-col justify-center items-center gap-8 h-full">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-textSecondary text-2xl font-medium">
          ¿Dónde se celebrará tu evento?
        </h1>
        <p className="text-secondary400">
          La ubicación ayudará a personalizar la experiencia de tus invitados
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col gap-3 "
        >
          <div className="flex items-center gap-4">
            <FormField
              control={form.control}
              name="eventCountry"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>País</FormLabel>
                  <Select
                    disabled={!!isDeciding}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="País donde te casas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60 bg-white">
                      {countries.map(country => (
                        <SelectItem
                          key={country.id}
                          value={country.name}
                          className="cursor-pointer border-b-[1px]"
                          style={{ margin: '0 auto' }}
                        >
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventCity"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="San Bernardino"
                      disabled={!!isDeciding}
                      className="!mt-1.5"
                      {...field}
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
              <FormItem className="flex gap-2 items-center">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={checked => {
                      field.onChange(checked);
                      handleIsDecidingCountryCity(checked);
                    }}
                  />
                </FormControl>
                <div className="!m-0">
                  <FormLabel className="text-base font-normal cursor-pointer">
                    Aún estamos decidiendo
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-center mt-6">
            <Button variant="login" className='w-72'>Continuar</Button>
          </div>
        </form>
      </Form>

      <OnboardingStepper step={3} />
    </div>
  );
}
