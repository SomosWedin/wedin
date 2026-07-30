import authConfig from '@/auth.config';
import { getEventSlugFromHost } from '@/lib/event-domain';
import {
  adminRoutes,
  apiAuthPrefix,
  authRoutes,
  onboardingRoute,
  protectedRoutes,
} from '@/lib/routes';
import NextAuth from 'next-auth';
import { type NextRequest, NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

const EVENT_SLUG_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;

  const configuredRootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost';

  const rootDomain = configuredRootDomain
    .trim()
    .toLowerCase()
    .split(':')[0]
    .replace(/\.$/, '');

  const hostHeader = request.headers.get('host') ?? '';

  const hostname = hostHeader
    .trim()
    .toLowerCase()
    .split(':')[0]
    .replace(/\.$/, '');

  const isApiOrRpcRoute =
    nextUrl.pathname === '/api' ||
    nextUrl.pathname.startsWith('/api/') ||
    nextUrl.pathname === '/trpc' ||
    nextUrl.pathname.startsWith('/trpc/');

  /*
   * Rewrite event subdomains internally.
   *
   * john-and-jane.somoswedin.com
   * becomes internally:
   * /e/john-and-jane 
   *
   * The URL displayed in the browser does not change.
   */
  const eventSlug = getEventSlugFromHost(
    hostHeader,
    rootDomain,
  );

  if (eventSlug && !isApiOrRpcRoute) {
    const rewriteUrl = nextUrl.clone();

    const eventPath =
      nextUrl.pathname === '/' ? '' : nextUrl.pathname;

    rewriteUrl.pathname = `/e/${eventSlug}${eventPath}`;

    return NextResponse.rewrite(rewriteUrl);
  }

  /*
   * Redirect old public event URLs to the new subdomain format.
   *
   * somoswedin.com/e/john-and-jane
   * redirects to:
   * john-and-jane.somoswedin.com
   *
   * Nested paths and query parameters are preserved.
   */
  const isRootHostname =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`;

  const legacyEventMatch = nextUrl.pathname.match(
    /^\/e\/([^/]+)(\/.*)?$/,
  );

  if (isRootHostname && legacyEventMatch) {
    const [, legacySlug, remainingPath = ''] =
      legacyEventMatch;

    if (EVENT_SLUG_PATTERN.test(legacySlug)) {
      const destination = nextUrl.clone();

      destination.protocol =
        rootDomain === 'localhost' ? 'http:' : 'https:';

      destination.hostname = `${legacySlug}.${rootDomain}`;
      destination.pathname = remainingPath || '/';

      // Keep localhost:3000 when testing locally.
      if (rootDomain !== 'localhost') {
        destination.port = '';
      }

      // Use 307 while testing. Change to 308 when everything is stable.
      return NextResponse.redirect(destination, 307);
    }
  }

  /*
   * Auth.js routes must pass through without authentication middleware.
   */
  const isApiAuthRoute =
    nextUrl.pathname.startsWith(apiAuthPrefix);

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  const session = await auth();

  const isLoggedIn = Boolean(session?.user);
  const isOnboarded = session?.user?.isOnboarded ?? false;
  const isAdmin = session?.user?.role === 'ADMIN';

  const isAdminRoute = adminRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);
  const isOnboardingRoute = onboardingRoute.includes(nextUrl.pathname);

  if (!isAdmin && isAdminRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  if (isLoggedIn && !isOnboarded && !isOnboardingRoute) {
    return NextResponse.redirect(
      new URL('/onboarding', nextUrl),
    );
  }

  if (
    isLoggedIn &&
    isOnboarded &&
    (isAuthRoute || isOnboardingRoute)
  ) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  if (
    !isLoggedIn &&
    (isProtectedRoute || isOnboardingRoute)
  ) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
