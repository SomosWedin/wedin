import { z, type ZodType } from 'zod';

export const EventUserUpdateSchema = z.object({
  eventDate: z.date().optional(),
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
  partnerEmail: z.string().email({ message: 'Email no válido' }),
});

export const BankDetailsFormSchema = z.object({
  eventId: z.string(),
  bankName: z.string().min(1, { message: 'Debe seleccionar una entidad' }),
  accountHolder: z
    .string()
    .min(1, { message: 'Nombre y apellido no puede estar vacío' })
    .min(2, { message: 'Nombre y Apellido muy corto' })
    .max(255, { message: 'Nombre y Apellido muy largo' }),
  accountNumber: z
    .string()
    .min(1, { message: 'Número de cuenta no puede estar vacío' })
    .max(24, { message: 'Número de cuenta muy largo' }),
  accountType: z.string().min(1, { message: 'Debe seleccionar una moneda' }),
  identificationType: z
    .string()
    .min(1, { message: 'Debe seleccionar un documento' }),
  identificationNumber: z
    .string()
    .min(1, { message: 'Número de documento no puede estar vacío' })
    .max(12, { message: 'Número de documento muy largo' }),
  razonSocial: z.string().optional(),
  ruc: z.string().optional(),
});
export type BankDetailsFormType = z.infer<typeof BankDetailsFormSchema>;

export const EventCoverFormSchema = z.object({
  coverMessage: z
    .string()
    .min(1, { message: 'El mensaje para tus invitados no puede estar vacío' })
    .min(3, {
      message:
        'El mensaje para tus invitados debe contener al menos 3 caracteres',
    })
    .max(255, {
      message:
        'El mensaje para tus invitados debe contener un máximo de 255 caracteres',
    }),
});
