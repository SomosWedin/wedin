'use server'

import { createHmac } from 'node:crypto'
import { headers } from 'next/headers'
import type { z } from 'zod'
import { signIn } from '@/auth'
import {
  magicLinkCooldown,
  magicLinkEmailLimit,
  magicLinkIpLimit,
} from '@/lib/rate-limit'
import { MagicLoginSchema } from '@/schemas/auth'

export type LoginValues = z.infer<typeof MagicLoginSchema>

const genericMessage =
  'Si el correo es válido y no solicitaste un enlace recientemente, lo recibirás en unos minutos.'

function createRateLimitKey(value: string) {
  const secret = process.env.RATE_LIMIT_SECRET

  if (!secret) {
    throw new Error('RATE_LIMIT_SECRET is not configured.')
  }

  return createHmac('sha256', secret).update(value).digest('hex')
}

export async function login(values: LoginValues) {
  const parsed = MagicLoginSchema.safeParse(values)

  if (!parsed.success) {
    return {
      error: 'Ingresá un correo válido.',
    }
  }

  const email = parsed.data.email.trim().toLowerCase()

  const emailKey = createRateLimitKey(email)

  const requestHeaders = await headers()

  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-real-ip')

  const ipKey = ip ? createRateLimitKey(ip) : null

  const [cooldownResult, emailResult, ipResult] = await Promise.all([
    magicLinkCooldown.limit(emailKey),
    magicLinkEmailLimit.limit(emailKey),

    ipKey ? magicLinkIpLimit.limit(ipKey) : Promise.resolve({ success: true }),
  ])

  const isRateLimited =
    !cooldownResult.success || !emailResult.success || !ipResult.success

  if (isRateLimited) {
    return {
      success: genericMessage,
    }
  }

  try {
    await signIn('resend', {
      email,
      redirect: false,
      redirectTo: '/onboarding',
    })

    return {
      success: genericMessage,
    }
  } catch (error) {
    console.error('Unable to send magic link:', error)

    return {
      error: 'No pudimos enviar el enlace. Intentá nuevamente.',
    }
  }
}
