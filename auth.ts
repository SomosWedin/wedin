import { randomUUID } from 'node:crypto'
import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth, { type DefaultSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import Resend from 'next-auth/providers/resend'
import { getUserByEmail, updateVerifiedOn } from '@/actions/data/user'
import prismaClient from '@/prisma/client'
import authConfig from './auth.config'

export type ErrorResponse = {
  error: string
}

export function isError(response: unknown): response is ErrorResponse {
  return (response as ErrorResponse).error !== undefined
}

const emailProvider = Resend({
  apiKey: process.env.RESEND_API_KEY,
  from: 'Wedin <no-reply@somoswedin.com>',

  async sendVerificationRequest({ identifier, url, provider }) {
    const existingUser = await prismaClient.user.findUnique({
      where: {
        email: identifier,
      },
      select: {
        id: true,
      },
    })

    const isNewUser = !existingUser

    const actionText = isNewUser ? 'Autenticar cuenta' : 'Iniciar sesión'

    const heading = isNewUser
      ? 'Confirmá tu cuenta de Wedin'
      : 'Ingresá a Wedin'

    const subject = isNewUser
      ? 'Autenticá tu cuenta de Wedin'
      : 'Tu enlace para iniciar sesión en Wedin'

    const body = isNewUser
      ? 'Recibimos una solicitud para crear una cuenta en Wedin con esta dirección de correo. Confirmala con el botón de abajo y seguí con la configuración de tu evento.'
      : 'Recibimos una solicitud para ingresar a tu cuenta de Wedin con esta dirección de correo. Usá el botón de abajo para entrar.'

    const expiryHours = Math.round((provider.maxAge ?? 86400) / 3600)

    const preheader = isNewUser
      ? 'Confirmá tu correo para terminar de crear tu cuenta.'
      : 'Tu enlace de acceso a Wedin.'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: provider.from,
        to: identifier,
        subject,
        ...(process.env.AUTH_EMAIL_REPLY_TO
          ? { reply_to: process.env.AUTH_EMAIL_REPLY_TO }
          : {}),
        headers: {
          'X-Entity-Ref-ID': randomUUID(),
        },

        html: `
          <!doctype html>
          <html lang="es">
            <body style="margin:0; padding:0; background:#f6f6f6; font-family:Arial,Helvetica,sans-serif;">
              <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
                ${preheader}
              </div>

              <div style="max-width:560px; margin:40px auto; padding:32px; background:white; border-radius:12px;">
                <p style="margin:0 0 24px; font-size:18px; font-weight:700; color:#16a268; letter-spacing:-0.02em;">
                  Wedin
                </p>

                <h1 style="color:#222; margin:0 0 16px; font-size:22px; line-height:1.3;">
                  ${heading}
                </h1>

                <p style="color:#555; line-height:1.6; margin:0 0 24px;">
                  ${body}
                </p>

                <a
                  href="${url}"
                  style="
                    display:inline-block;
                    padding:14px 24px;
                    margin:0 0 24px;
                    background:#16a268;
                    color:white;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:600;
                  "
                >
                  ${actionText}
                </a>

                <p style="color:#555; line-height:1.6; margin:0 0 8px; font-size:14px;">
                  Si el botón no funciona, copiá y pegá esta dirección en tu navegador:
                </p>

                <p style="margin:0 0 24px; font-size:13px; line-height:1.5; word-break:break-all; color:#16a268;">
                  ${url}
                </p>

                <p style="color:#555; line-height:1.6; margin:0 0 8px; font-size:14px;">
                  El enlace vence en ${expiryHours} horas y sirve una sola vez.
                </p>

                <p style="color:#888; font-size:13px; line-height:1.6; margin:0;">
                  Si no solicitaste este enlace, podés ignorar este correo. Nadie
                  podrá acceder a tu cuenta sin abrirlo.
                </p>

                <hr style="border:none; border-top:1px solid #eee; margin:32px 0 16px;" />

                <p style="color:#999; font-size:12px; line-height:1.6; margin:0 0 8px;">
                  Wedin — listas de regalos para bodas y eventos. Asunción, Paraguay.
                </p>

                <p style="color:#999; font-size:12px; line-height:1.6; margin:0;">
                  Recibiste este correo porque se solicitó un enlace de acceso para
                  ${identifier} en
                  <a href="https://www.somoswedin.com" style="color:#999;">somoswedin.com</a>.
                  Es un correo transaccional, no una comunicación publicitaria.
                </p>
              </div>
            </body>
          </html>
        `,

        text: `${heading}

${body}

${actionText}: ${url}

El enlace vence en ${expiryHours} horas y sirve una sola vez.

Si no solicitaste este enlace, podés ignorar este correo. Nadie podrá acceder a tu cuenta sin abrirlo.

--
Wedin — listas de regalos para bodas y eventos. Asunción, Paraguay.
Recibiste este correo porque se solicitó un enlace de acceso para ${identifier} en somoswedin.com.
Es un correo transaccional, no una comunicación publicitaria.`,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resend error: ${error}`)
    }
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      isOnboarded: boolean
      role: string
      eventId: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isOnboarded: boolean
    role: string
    eventId: string | null
    id: string
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prismaClient),
  providers: [...authConfig.providers, emailProvider],
  pages: {
    signIn: '/login',
    error: '/error',
  },
  events: {
    async linkAccount({ user }) {
      if (!user.email) return

      await updateVerifiedOn(user.email)
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token }) {
      if (!token?.email) return token

      const user = await getUserByEmail(token.email)

      if (isError(user)) {
        return null
      }

      token.isOnboarded = user.isOnboarded
      token.role = user.role
      token.id = user.id
      token.eventId = user.eventId

      return token
    },
  },
})
