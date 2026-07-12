import { z } from 'zod';

export const GuestCheckoutSchema = z.object({
  payerName: z
    .string()
    .min(3, { message: 'El nombre debe tener al menos 3 caracteres' })
    .max(24, { message: 'El nombre es demasiado largo' })
    .regex(/^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s'-]*$/, {
      message: 'El nombre solo puede contener letras',
    }),
  payerEmail: z
    .string()
    .min(1, { message: 'Tu email no puede estar vacío' })
    .email('Email inválido'),
  paymentMethod: z
    .enum(['CARD', 'BANK_TRANSFER'], {
      required_error: 'Elegí una forma de pago',
    })
    .default('CARD'),
});
