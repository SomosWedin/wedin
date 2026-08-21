import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth, { type DefaultSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import Resend from 'next-auth/providers/resend'
import { getUserByEmail, updateVerifiedOn } from '@/actions/data/user'
import {
  renderEmailButton,
  renderEmailLayout,
  sendEmail,
  WEDIN_EMAIL_FROM,
} from '@/lib/emails'
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
  from: WEDIN_EMAIL_FROM,

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
      ? 'Confirmá tu correo para crear tu cuenta y comenzar el onboarding.'
      : 'Usá el siguiente enlace para ingresar a tu cuenta.'

    const textBody = isNewUser
      ? 'Confirmá tu correo para crear tu cuenta:'
      : 'Abrí este enlace para iniciar sesión:'

    await sendEmail({
      apiKey: provider.apiKey,
      from: provider.from,
      to: identifier,
      subject,

      html: renderEmailLayout({
        heading,
        body,
        content: renderEmailButton(url, actionText),
        footer: 'Si no solicitaste este enlace, podés ignorar este correo.',
      }),

      text: `
${heading}

${textBody}

${url}
        `.trim(),
    })
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
