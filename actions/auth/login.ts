'use server';

import { signIn } from '@/auth';
import { MagicLoginSchema } from '@/schemas/auth';
import { AuthError } from 'next-auth';
import type { z } from 'zod';

export type LoginValues = z.infer<typeof MagicLoginSchema>;

export async function login(values: LoginValues) {
  const parsed = MagicLoginSchema.safeParse(values);

  if (!parsed.success) {
    return { error: 'Correo inválido' };
  }

  try {
    await signIn('resend', {
      email: parsed.data.email,
      redirect: false,
      redirectTo: '/onboarding'
    });

    return {
      success: 'Te enviamos un enlace para que confirmes e inicies sesión',
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: 'No pudimos enviar el enlace. Intentá nuevamente.',
      };
    }

    throw error;
  }
}
