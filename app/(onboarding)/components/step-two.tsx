import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepTwoSchema } from '@/schemas/onboarding';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import Image from 'next/image';
import OnboardingStepper from './stepper';
import illustration from '@/public/onb-step-two-icon.svg';
import wedinIcon from '@/public/w-icon.svg';

export default function StepTwo() {
  const form = useForm<z.infer<typeof StepTwoSchema>>({
    resolver: zodResolver(StepTwoSchema),
    defaultValues: {
      name: '',
      lastName: '',
      partnerName: '',
      partnerLastName: '',
      partnerEmail: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof StepTwoSchema>) => {
    console.log(values);
  };

  return (
    <div className="relative flex flex-col justify-center items-center gap-8 h-full">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-textSecondary text-2xl font-medium">
          ¿Cómo se llaman los protagonistas del evento?
        </h1>
        <p className="text-secondary400">
          Este nombre será visible en tu página personalizada
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 w-full"
        >
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
          </div>

          <div className="w-full flex items-center gap-2">
            <div className="border-b border-gray200 w-full h-full -mt-6"></div>
            <Image src={illustration} alt="illustration" width={42} />
            <div className="border-b border-gray200 w-full h-full -mt-6"></div>
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
          </div>

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

          <div className="flex justify-center">
            <Button type="submit" variant="login" className="mt-4 w-72">
              Continuar
            </Button>
          </div>
        </form>
      </Form>

      <OnboardingStepper step={2} />
    </div>
  );
}
