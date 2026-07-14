import {
  adminRoutes,
  apiAuthPrefix,
  authRoutes,
  onboardingRoute,
  protectedRoutes,
} from '@/lib/routes';
import { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import authConfig from '@/auth.config';

const { auth } = NextAuth(authConfig);

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { nextUrl } = request;

  const isLoggedIn = !!session?.user;
  const isOnboarded = isLoggedIn ? session.user.isOnboarded : false;
  const isAdmin = isLoggedIn ? session.user.role === 'ADMIN' : false;
  const isExistingUser = isLoggedIn ? session.user.isExistingUser : false;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isAdminRoute = adminRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);
  const isOnboardingRoute = onboardingRoute.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return;
  }

  if (!isAdmin && isAdminRoute) {
    return Response.redirect(new URL('/dashboard', nextUrl));
  }

  if (isLoggedIn && !isExistingUser) {
    return Response.redirect(new URL('/api/auth/signout', nextUrl));
  }

  if (isLoggedIn && !isOnboarded && !isOnboardingRoute) {
    return Response.redirect(new URL('/onboarding', nextUrl));
  }

  if (isLoggedIn && isOnboarded && (isAuthRoute || isOnboardingRoute)) {
    return Response.redirect(new URL('/dashboard', nextUrl));
  }

  if (!isLoggedIn && (isProtectedRoute || isOnboardingRoute)) {
    return Response.redirect(new URL('/login', nextUrl));
  }
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
