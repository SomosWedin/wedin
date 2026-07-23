export const publicRoutes: string[] = [
  '/e',
  '/email-verfiy',
];

export const authRoutes: string[] = [
  '/login',
  '/register',
  '/password-reset',
  '/new-password',
];

export const protectedRoutes: string[] = [
  '/gifts',
  '/bank-details',
  '/billetera',
  '/dashboard',
  '/event-details',
  '/event-settings',
  '/transactions',
  '/wishlist',
  '/gifts-received',
];

export const adminRoutes: string[] = ['/admin'];

export const onboardingRoute: string[] = ['/onboarding'];

export const apiAuthPrefix: string = '/api/auth';

export const DEFAULT_LOGIN_REDIRECT_ROUTE = '/dashboard';
