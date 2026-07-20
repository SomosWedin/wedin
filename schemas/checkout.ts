import { z } from 'zod';

export const GuestCheckoutSchema = z
  .object({
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
    // Only required for CARD — Pagopar's iniciar-transaccion rejects the
    // order without comprador.documento. BANK_TRANSFER never calls Pagopar.
    payerDocument: z
      .string()
      .regex(/^\d{5,10}$/, { message: 'Ingresá un número de cédula válido' })
      .optional()
      .or(z.literal('')),
    paymentMethod: z
      .enum(['CARD', 'BANK_TRANSFER'], {
        required_error: 'Elegí una forma de pago',
      })
      .default('CARD'),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'CARD' && !data.payerDocument) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La cédula es obligatoria para pagos con tarjeta',
        path: ['payerDocument'],
      });
    }
  });
