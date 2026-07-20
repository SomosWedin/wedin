import { z } from 'zod';

export const MagicLoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Tu email no puede estar vacío' })
    .email('Email inválido'),
});
