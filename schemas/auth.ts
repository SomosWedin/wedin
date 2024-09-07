import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Tu email no puede estar vacío' })
    .email('Email inválido'),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .max(255, { message: `Slow down cowboy, you're not Julian Assange` }),
});

export const MagicLoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Tu email no puede estar vacío' })
    .email('Email inválido'),
});

export const RegisterSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: 'Tu email no puede estar vacío' })
      .email('Email inválido'),
    password: z
      .string()
      .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
      .max(255, { message: "Slow down cowboy, you're not Julian Assange" }),
    passwordConfirmation: z.string().min(1).max(255),
    eventType: z.string().optional(),
  })
  .refine(data => data.password === data.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'], // This specifies which field the error message should be associated with
  });

export const PasswordResetSchema = LoginSchema.pick({ email: true });

export const NewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
      .max(255, { message: "Slow down cowboy, you're not Julian Assange" }),
    passwordConfirmation: z.string().min(1).max(255),
  })
  .refine(data => data.password === data.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'], // This specifies which field the error message should be associated with
  });

