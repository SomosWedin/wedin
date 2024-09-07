import { z, boolean } from 'zod';

export const StepOneSchema = z.object({
    eventUrl: z
      .string()
      .min(1, { message: 'La dirección de tu espacio no puede estar vacío' })
      .min(3, {
        message: 'La dirección de tu espacio debe contener al menos 3 caracteres',
      })
      .max(255, {
        message:
          'La dirección de tu espacio debe contener un máximo de 255 caracteres',
      }),
    name: z
      .string()
      .min(1, { message: 'El nombre no puede estar vacío' })
      .min(2, { message: 'Nombre muy corto' })
      .max(255, { message: 'Nombre muy largo' }),
    lastName: z
      .string()
      .min(1, { message: 'El apellido no puede estar vacío' })
      .min(2, { message: 'Apellido muy corto' })
      .max(255, { message: 'Apellido muy largo' }),
    partnerName: z
      .string()
      .min(1, { message: 'El nombre de tu pareja no puede estar vacío' })
      .min(2, { message: 'Nombre muy corto' })
      .max(255, { message: 'Nombre muy largo' }),
    partnerLastName: z
      .string()
      .min(1, { message: 'El apellido de tu pareja no puede estar vacío' })
      .min(2, { message: 'Apellido muy corto' })
      .max(255, { message: 'Apellido muy largo' }),
    partnerEmail: z
      .string()
      .min(1, { message: 'El email de tu pareja no puede estar vacío' })
      .email('Email inválido'),
    eventDate: z.date().optional(),
    isDecidingEventDate: z.boolean(),
  });
  
  export const StepTwoSchema = z.object({
    eventCountry: z.string().optional(),
    eventCity: z.string().optional(),
    isDecidingEventLocation: boolean(),
    hasPYbankAccount: z.boolean(),
  });