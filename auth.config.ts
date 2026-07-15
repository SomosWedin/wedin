import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import type { NextAuthConfig } from 'next-auth';

// Edge-safe config: no Prisma/adapter/DB calls here.
// This is used directly by middleware.ts (Edge runtime) and merged
// into the full config in auth.ts (Node.js runtime).
const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
        session.user.isExistingUser = token.isExistingUser;
        session.user.role = token.role;
        session.user.isOnboarded = token.isOnboarded;
        session.user.id = token.id;
        session.user.eventId = token.eventId;
      }

      return session;
    },
  },
};

export default authConfig;
