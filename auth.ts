import { getUserByEmail, updateVerifiedOn } from '@/actions/data/user';
import prismaClient from '@/prisma/client';
import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import Resend from "next-auth/providers/resend";
import authConfig from './auth.config';

export type ErrorResponse = {
  error: string;
};

export function isError(response: unknown): response is ErrorResponse {
  return (response as ErrorResponse).error !== undefined;
}

const emailProvider =
  Resend({
    apiKey: process.env.RESEND_API_KEY,
    from: 'Wedin <no-reply@somoswedin.com>',
  });

declare module 'next-auth' {
  interface Session {
    user: {
      isOnboarded: boolean;
      role: string;
      eventId: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isOnboarded: boolean;
    role: string;
    eventId: string | null;
    id: string;
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
  providers: [
    ...authConfig.providers,
    emailProvider
  ],
  pages: {
    signIn: '/login',
    error: '/error',
  },
  events: {
    async linkAccount({ user }) {
      if (!user.email) return;

      await updateVerifiedOn(user.email);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token }) {
      if (!token || !token.email) return token;

      const user = await getUserByEmail(token.email);

      if (isError(user)) {
        return null;
      }

      token.isOnboarded = user.isOnboarded;
      token.role = user.role;
      token.id = user.id;
      token.eventId = user.eventId;

      return token;
    },
  },
});
