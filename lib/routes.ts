export const publicRoutes: string[] = [
  '/gifts',
  '/events',
  '/giftlists',
  '/',
  '/email-verfiy',
];

export const authRoutes: string[] = [
  '/login',
  '/register',
  '/password-reset',
  '/new-password',
];

export const protectedRoutes: string[] = [
  '/bank-details',
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
