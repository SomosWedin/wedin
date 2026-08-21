'use server'

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { headers } from 'next/headers'
import type { z } from 'zod'
import { startAdminSession } from '@/actions/auth/admin-session'
import { getCurrentUser } from '@/actions/get-current-user'
import { renderEmailCode, renderEmailLayout, sendEmail } from '@/lib/emails'
import {
  adminOtpCooldown,
  adminOtpIpLimit,
  adminOtpUserLimit,
  adminOtpVerifyLimit,
} from '@/lib/rate-limit'
import prismaClient from '@/prisma/client'
import { AdminOtpSchema } from '@/schemas/auth'

export type AdminOtpValues = z.infer<typeof AdminOtpSchema>

const CODE_TTL_MINUTES = 10

const MAX_ATTEMPTS = 5

const unauthorized = { error: 'No autorizado.' }

function hashCode(code: string) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured.')
  }

  return createHmac('sha256', secret).update(`admin-otp:${code}`).digest('hex')
}

function matchesCode(code: string, codeHash: string) {
  const candidate = Buffer.from(hashCode(code))
  const stored = Buffer.from(codeHash)

  if (candidate.length !== stored.length) return false

  return timingSafeEqual(candidate, stored)
}

function createRateLimitKey(value: string) {
  const secret = process.env.RATE_LIMIT_SECRET

  if (!secret) {
    throw new Error('RATE_LIMIT_SECRET is not configured.')
  }

  return createHmac('sha256', secret).update(value).digest('hex')
}

async function getIpKey() {
  const requestHeaders = await headers()

  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-real-ip')

  return ip ? createRateLimitKey(ip) : null
}

export async function requestAdminOtp() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN' || !currentUser.email) {
    return unauthorized
  }

  const userKey = createRateLimitKey(currentUser.id)

  const ipKey = await getIpKey()

  const [cooldownResult, userResult, ipResult] = await Promise.all([
    adminOtpCooldown.limit(userKey),
    adminOtpUserLimit.limit(userKey),

    ipKey ? adminOtpIpLimit.limit(ipKey) : Promise.resolve({ success: true }),
  ])

  if (!cooldownResult.success) {
    return {
      error: 'Ya te enviamos un código. Esperá un minuto antes de pedir otro.',
    }
  }

  if (!userResult.success || !ipResult.success) {
    return {
      error: 'Demasiados intentos. Probá de nuevo en una hora.',
    }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')

  await prismaClient.adminOtp.deleteMany({
    where: { userId: currentUser.id, consumedAt: null },
  })

  await prismaClient.adminOtp.create({
    data: {
      userId: currentUser.id,
      codeHash: hashCode(code),
      expires: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  })

  const heading = 'Tu código de acceso al panel de staff'

  const body = `Ingresá este código para entrar al panel. Vence en ${CODE_TTL_MINUTES} minutos.`

  try {
    await sendEmail({
      to: currentUser.email,
      subject: 'Código de acceso al panel de staff de Wedin',

      html: renderEmailLayout({
        heading,
        body,
        content: renderEmailCode(code),
        footer:
          'Si no intentaste entrar al panel, ignorá este correo y avisá al equipo.',
      }),

      text: `${heading}\n\n${body}\n\n${code}`,
    })
  } catch (error) {
    console.error('Unable to send admin access code:', error)

    return { error: 'No pudimos enviar el código. Intentá nuevamente.' }
  }

  return { success: 'Te enviamos un código a tu correo.' }
}

export async function verifyAdminOtp(values: AdminOtpValues) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    return unauthorized
  }

  const verifyResult = await adminOtpVerifyLimit.limit(
    createRateLimitKey(currentUser.id)
  )

  if (!verifyResult.success) {
    return { error: 'Demasiados intentos. Probá de nuevo en una hora.' }
  }

  const parsed = AdminOtpSchema.safeParse(values)

  if (!parsed.success) {
    return { error: 'El código tiene 6 dígitos.' }
  }

  const otp = await prismaClient.adminOtp.findFirst({
    where: {
      userId: currentUser.id,
      consumedAt: null,
      expires: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp || otp.attempts >= MAX_ATTEMPTS) {
    return { error: 'El código expiró o no es válido. Pedí uno nuevo.' }
  }

  const updated = await prismaClient.adminOtp.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } },
  })

  if (!matchesCode(parsed.data.code, otp.codeHash)) {
    const remaining = MAX_ATTEMPTS - updated.attempts

    if (remaining <= 0) {
      await prismaClient.adminOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      })

      return { error: 'Código incorrecto. Pedí uno nuevo.' }
    }

    return {
      error: `Código incorrecto. Te ${
        remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`
      }.`,
    }
  }

  await prismaClient.adminOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  })

  const started = await startAdminSession(currentUser.id)

  if (!started) {
    return { error: 'No pudimos abrir la sesión. Iniciá sesión nuevamente.' }
  }

  return { success: true }
}
