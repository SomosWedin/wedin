import prismaClient from '@/prisma/client';
import { getUserByEmail, updateVerifiedOn } from '@/actions/data/user';
import NextAuth, { type DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { LoginSchema } from '@/schemas/auth';
import authConfig from './auth.config';

export type ErrorResponse = {
  error: string;
};

export function isError(response: unknown): response is ErrorResponse {
  return (response as ErrorResponse).error !== undefined;
}

declare module 'next-auth' {
  interface Session {
    user: {
      isOnboarded: boolean;
      role?: string;
      isExistingUser?: boolean;
      eventId?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isOnboarded: boolean;
    role: string;
    isExistingUser?: boolean;
    eventId: string;
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
    Credentials({
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;

          const user = await prismaClient.user.findUnique({
            where: { email },
          });

          if (!user) {
            return null;
          }

          if (!user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            return null;
          }

          return user;
        }

        return null;
      },
    }),
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
    async signIn({ user, account }) {
      if (!user || !user.email) return false;

      if (account && account.type !== 'credentials') return true;

      const existingUser = await getUserByEmail(user.email);

      if (!existingUser || !existingUser.emailVerified) {
        return true;
      }

      return true;
    },
    async jwt({ token }) {
      if (!token || !token.email) return token;

      const response = await getUserByEmail(token.email);

      if (isError(response)) {
        switch (response.error) {
          case 'User not found':
            token.isExistingUser = false;
            break;
          default:
            // You might decide to leave isExistingUser unchanged if it's an internal error
            return token;
        }
        return token;
      }

      token.name = response.name;
      token.isOnboarded = response.isOnboarded;
      token.role = response.role;
      token.isExistingUser = true;
      token.id = response.id;
      token.eventId = response.eventId;

      return token;
    },
  },
});
