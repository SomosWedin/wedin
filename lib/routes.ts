import { TERMS_BASE_PATH } from '@/lib/terms'

export const publicRoutes: string[] = ['/e']

// Readable by anyone, in any session state — they are the documents a user is
// asked to accept, so an unfinished onboarding must not redirect away from one.
export const legalRoutes: string[] = [TERMS_BASE_PATH]

export const authRoutes: string[] = ['/login']

export const protectedRoutes: string[] = [
  '/gifts',
  '/bank-details',
  '/billetera',
  '/dashboard',
  '/event-details',
  '/event-settings',
  '/preview',
  '/transactions',
  '/wishlist',
  '/gifts-received',
]

export const adminRoutes: string[] = ['/admin']

export const onboardingRoute: string[] = ['/onboarding']

export const apiAuthPrefix: string = '/api/auth'

export const DEFAULT_LOGIN_REDIRECT_ROUTE = '/dashboard'
