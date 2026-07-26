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
    // Only required for CARD — Pagopar's iniciar-transaccion needs an email
    // for the payer. BANK_TRANSFER collects a phone number instead.
    payerEmail: z
      .string()
      .email('Email inválido')
      .optional()
      .or(z.literal('')),
    // Only required for CARD — Pagopar's iniciar-transaccion rejects the
    // order without comprador.documento. BANK_TRANSFER never calls Pagopar.
    payerDocument: z
      .string()
      .regex(/^\d{5,10}$/, { message: 'Ingresá un número de cédula válido' })
      .optional()
      .or(z.literal('')),
    // Only required for BANK_TRANSFER, since that's the guest-thanking flow
    // that prefers WhatsApp over email.
    payerPhone: z
      .string()
      .regex(/^\d{6,15}$/, { message: 'Ingresá un número de teléfono válido' })
      .optional()
      .or(z.literal('')),
    payerMessage: z.string().max(500).optional().or(z.literal('')),
    paymentMethod: z
      .enum(['CARD', 'BANK_TRANSFER'], {
        required_error: 'Elegí una forma de pago',
      })
      .default('CARD'),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'CARD') {
      if (!data.payerEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tu email no puede estar vacío',
          path: ['payerEmail'],
        });
      }
      if (!data.payerDocument) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La cédula es obligatoria para pagos con tarjeta',
          path: ['payerDocument'],
        });
      }
    }

    if (data.paymentMethod === 'BANK_TRANSFER' && !data.payerPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El teléfono es obligatorio para transferencia bancaria',
        path: ['payerPhone'],
      });
    }
  });
