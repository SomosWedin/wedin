import { z } from 'zod'

export const MagicLoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Tu email no puede estar vacío' })
    .email('Email inválido'),
})

export const AdminOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: 'El código tiene 6 dígitos' }),
})
