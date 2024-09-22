import { z, boolean } from 'zod';

export const StepTwoSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Tu nombre no puede estar vacío' })
    .min(2, { message: 'Nombre muy corto' })
    .max(255, { message: 'Nombre muy largo' }),
  lastName: z
    .string()
    .min(1, { message: 'Tu apellido no puede estar vacío' })
    .min(2, { message: 'Apellido muy corto' })
    .max(255, { message: 'Apellido muy largo' }),
  partnerName: z.string().optional(),
  partnerLastName: z.string().optional(),
});

export const StepThreeSchema = z.object({
  eventCountry: z.string().optional(),
  eventCity: z.string().optional(),
  isDecidingEventLocation: boolean(),
});

export const StepFourSchema = z.object({
  eventDate: z.date().optional(),
  isDecidingEventDate: boolean(),
});
