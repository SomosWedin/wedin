import { type NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import authConfig from '@/auth.config'
import {
  EVENT_SLUG_PATTERN,
  getConfiguredRootDomain,
  getEventSlugFromHost,
  getPublicEventUrl,
} from '@/lib/event-domain'
import {
  adminRoutes,
  authRoutes,
  legalRoutes,
  onboardingRoute,
  protectedRoutes,
} from '@/lib/routes'

const { auth } = NextAuth(authConfig)

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request
  const pathname = nextUrl.pathname

  const isApiOrRpcRoute =
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/trpc' ||
    pathname.startsWith('/trpc/')

  if (isApiOrRpcRoute) {
    return NextResponse.next()
  }

  // /e/amelie-y-john
  const legacyEventMatch = pathname.match(/^\/e\/([^/]+)(\/.*)?$/)

  if (legacyEventMatch) {
    const [, legacySlug, remainingPath = ''] = legacyEventMatch

    if (EVENT_SLUG_PATTERN.test(legacySlug)) {
      const destination = new URL(
        getPublicEventUrl(legacySlug, remainingPath || '/')
      )

      destination.search = nextUrl.search

      return NextResponse.redirect(destination, 307)
    }
  }

  const rootDomain = getConfiguredRootDomain()

  const eventSlug = getEventSlugFromHost(
    request.headers.get('host'),
    rootDomain
  )

  if (eventSlug) {
    const rewriteUrl = nextUrl.clone()

    const eventPath = pathname === '/' ? '' : pathname

    rewriteUrl.pathname = `/e/${eventSlug}${eventPath}`

    return NextResponse.rewrite(rewriteUrl)
  }

  const isPagoparResultRoute = pathname.startsWith('/checkout/pagopar/result/')

  if (isPagoparResultRoute) {
    return NextResponse.next()
  }

  const session = await auth()

  const isLoggedIn = Boolean(session?.user)

  const isOnboarded = session?.user?.isOnboarded ?? false

  const isAdmin = session?.user?.role === 'ADMIN'

  const isAdminRoute = matchesRoute(pathname, adminRoutes)

  const isAuthRoute = matchesRoute(pathname, authRoutes)

  const isProtectedRoute = matchesRoute(pathname, protectedRoutes)

  const isOnboardingRoute = matchesRoute(pathname, onboardingRoute)

  const isLegalRoute = matchesRoute(pathname, legalRoutes)

  if (!isLoggedIn && (isAdminRoute || isProtectedRoute || isOnboardingRoute)) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn && !isAdmin && isAdminRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (isLoggedIn && !isOnboarded && !isOnboardingRoute && !isLegalRoute) {
    return NextResponse.redirect(new URL('/onboarding', nextUrl))
  }

  if (isLoggedIn && isOnboarded && (isAuthRoute || isOnboardingRoute)) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
