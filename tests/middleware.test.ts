import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}))

vi.mock('next-auth', () => ({
  default: () => ({
    auth: authMock,
  }),
}))

vi.mock('@/auth.config', () => ({
  default: {},
}))

import { hashSessionBinding, signAdminSession } from '@/lib/admin-session'
import { middleware } from '@/middleware'

type RequestOptions = {
  origin?: string
  host?: string
  method?: string
  cookies?: Record<string, string>
}

function createRequest(path: string, options: RequestOptions = {}) {
  const origin = options.origin ?? 'https://www.somoswedin.com'
  const url = new URL(path, origin)

  const cookie = Object.entries(options.cookies ?? {})
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')

  return new NextRequest(url, {
    method: options.method ?? 'GET',
    headers: {
      host: options.host ?? url.host,
      ...(cookie ? { cookie } : {}),
    },
  })
}

function expectNext(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('x-middleware-next')).toBe('1')
}

function getRewriteUrl(response: Response) {
  const value = response.headers.get('x-middleware-rewrite')

  expect(value).not.toBeNull()
  return new URL(value!)
}

function getRedirectUrl(response: Response) {
  const value = response.headers.get('location')

  expect(value).not.toBeNull()
  return new URL(value!)
}

const onboardedUser = {
  user: {
    id: 'user-id',
    role: 'USER',
    isOnboarded: true,
  },
}

const onboardingUser = {
  user: {
    id: 'user-id',
    role: 'USER',
    isOnboarded: false,
  },
}

const adminUser = {
  user: {
    id: 'admin-id',
    role: 'ADMIN',
    isOnboarded: true,
  },
}

const onboardingAdminUser = {
  user: {
    id: 'admin-id',
    role: 'ADMIN',
    isOnboarded: false,
  },
}

const AUTH_SESSION_TOKEN = 'auth-session-token'

async function adminCookies(userId = 'admin-id') {
  const token = await signAdminSession({
    userId,
    sessionBinding: await hashSessionBinding(AUTH_SESSION_TOKEN),
  })

  return {
    'authjs.session-token': AUTH_SESSION_TOKEN,
    wedin_admin: token,
  }
}

describe('middleware canonical event URLs', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'somoswedin.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.somoswedin.com'
    authMock.mockResolvedValue(null)
  })

  // Browser: https://amelie-y-john.somoswedin.com/ -> Internal: /e/amelie-y-john
  it('rewrites an event subdomain root to the internal event page', async () => {
    const response = await middleware(
      createRequest('/', {
        origin: 'https://amelie-y-john.somoswedin.com',
      })
    )

    const rewrite = getRewriteUrl(response)

    expect(rewrite.pathname).toBe('/e/amelie-y-john')
    expect(authMock).not.toHaveBeenCalled()
  })

  // Browser: https://amelie-y-john.somoswedin.com/checkout -> Internal: /e/amelie-y-john/checkout
  it('rewrites nested checkout paths without duplicating the internal prefix', async () => {
    const response = await middleware(
      createRequest('/checkout', {
        origin: 'https://amelie-y-john.somoswedin.com',
      })
    )

    expect(getRewriteUrl(response).pathname).toBe('/e/amelie-y-john/checkout')
  })

  // Browser: https://amelie-y-john.somoswedin.com/checkout/transfer?ref=tx-1%2Ctx-2 ->
  // Internal: /e/amelie-y-john/checkout/transfer?ref=tx-1%2Ctx-2
  it('rewrites bank-transfer paths and preserves the transaction query', async () => {
    const response = await middleware(
      createRequest('/checkout/transfer?ref=tx-1%2Ctx-2', {
        origin: 'https://amelie-y-john.somoswedin.com',
      })
    )

    const rewrite = getRewriteUrl(response)

    expect(rewrite.pathname).toBe('/e/amelie-y-john/checkout/transfer')
    expect(rewrite.searchParams.get('ref')).toBe('tx-1,tx-2')
  })

  // Browser: https://amelie-y-john.somoswedin.com/?utm_source=invitation&guest=123 ->
  // Internal: /e/amelie-y-john?utm_source=invitation&guest=123
  it('preserves arbitrary query parameters during an event rewrite', async () => {
    const response = await middleware(
      createRequest('/?utm_source=invitation&guest=123', {
        origin: 'https://amelie-y-john.somoswedin.com',
      })
    )

    const rewrite = getRewriteUrl(response)

    expect(rewrite.pathname).toBe('/e/amelie-y-john')
    expect(rewrite.searchParams.get('utm_source')).toBe('invitation')
    expect(rewrite.searchParams.get('guest')).toBe('123')
  })

  // https://www.somoswedin.com/e/amelie-y-john -> https://amelie-y-john.somoswedin.com/
  it('redirects a legacy event URL to its canonical subdomain', async () => {
    const response = await middleware(createRequest('/e/amelie-y-john'))

    expect(response.status).toBe(307)
    expect(getRedirectUrl(response).href).toBe(
      'https://amelie-y-john.somoswedin.com/'
    )
  })

  // https://www.somoswedin.com/e/amelie-y-john/checkout/transfer?ref=tx-1%2Ctx-2 ->
  //https://amelie-y-john.somoswedin.com/checkout/transfer?ref=tx-1%2Ctx-2
  it('preserves nested paths and queries in a legacy redirect', async () => {
    const response = await middleware(
      createRequest('/e/amelie-y-john/checkout/transfer?ref=tx-1%2Ctx-2')
    )

    const redirect = getRedirectUrl(response)

    expect(redirect.pathname).toBe('/checkout/transfer')
    expect(redirect.searchParams.get('ref')).toBe('tx-1,tx-2')
  })

  // https://amelie-y-john.somoswedin.com/e/amelie-y-john/checkout ->
  // https://amelie-y-john.somoswedin.com/checko
  it('canonicalizes an accidentally exposed internal path on an event host', async () => {
    const response = await middleware(
      createRequest('/e/amelie-y-john/checkout', {
        origin: 'https://amelie-y-john.somoswedin.com',
      })
    )

    expect(getRedirectUrl(response).href).toBe(
      'https://amelie-y-john.somoswedin.com/checkout'
    )
  })

  // https://amelie-y-john.somoswedin.com/e/other-couple/checkout ->
  // https://other-couple.somoswedin.com/checkout
  it('redirects a mismatched exposed internal slug to that slug canonical host', async () => {
    const response = await middleware(
      createRequest('/e/other-couple/checkout', {
        origin: 'https://amelie-y-john.somoswedin.com',
      })
    )

    expect(getRedirectUrl(response).href).toBe(
      'https://other-couple.somoswedin.com/checkout'
    )
  })

  // http://localhost:3000/e/amelie-y-john/checkout ->
  // http://amelie-y-john.localhost:3000/checkout
  it('preserves the localhost port in legacy redirects', async () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'localhost'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    const response = await middleware(
      createRequest('/e/amelie-y-john/checkout', {
        origin: 'http://localhost:3000',
      })
    )

    expect(getRedirectUrl(response).href).toBe(
      'http://amelie-y-john.localhost:3000/checkout'
    )
  })

  // Browser: https://amelie-y-john.wedin-staging.somoswedin.com/checkout ->
  // Internal: /e/amelie-y-john/checkou
  it('rewrites a staging event using the staging root domain', async () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'wedin-staging.somoswedin.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://wedin-staging.somoswedin.com'

    const response = await middleware(
      createRequest('/checkout', {
        origin: 'https://amelie-y-john.wedin-staging.somoswedin.com',
      })
    )

    expect(getRewriteUrl(response).pathname).toBe('/e/amelie-y-john/checkout')
  })

  // https://wedin-staging.somoswedin.com/login ->
  // unchanged (normal application route)
  it('does not mistake the staging application host for an event slug', async () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'wedin-staging.somoswedin.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://wedin-staging.somoswedin.com'

    const response = await middleware(
      createRequest('/login', {
        origin: 'https://wedin-staging.somoswedin.com',
      })
    )

    expectNext(response)
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(authMock).toHaveBeenCalledTimes(1)
  })

  // https://www.somoswedin.com{path} ->
  // unchanged (the malformed slug must not become a subdomain)
  it.each(['/e/a', '/e/ab', '/e/-invalid', '/e/invalid-', '/e/invalid.slug'])(
    'does not redirect the malformed legacy path %s',
    async path => {
      const response = await middleware(createRequest(path))

      expectNext(response)
      expect(response.headers.get('location')).toBeNull()
      expect(authMock).toHaveBeenCalledTimes(1)
    }
  )

  // {origin}/login -> unchanged (the host is not a couple's event subdomain)
  it.each([
    'https://somoswedin.com',
    'https://www.somoswedin.com',
    'https://wedin-git-feature.vercel.app',
  ])('does not rewrite the non-event host %s', async origin => {
    const response = await middleware(createRequest('/login', { origin }))

    expectNext(response)
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(authMock).toHaveBeenCalledTimes(1)
  })

  // https://{host}/ -> unchanged (the hostname is not a valid event subdomain)
  it.each([
    '-invalid.somoswedin.com',
    'invalid-.somoswedin.com',
    'nested.slug.somoswedin.com',
  ])('does not rewrite the invalid event host %s', async host => {
    const response = await middleware(
      createRequest('/', {
        origin: `https://${host}`,
      })
    )

    expectNext(response)
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
  })
})

describe('middleware callbacks and APIs', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'somoswedin.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.somoswedin.com'
    authMock.mockResolvedValue(onboardingUser)
  })

  // https://www.somoswedin.com{path} ->
  // unchanged (Auth.js handles the request directly)
  it.each([
    '/api/auth/callback/resend?token=secret&email=user%40example.com',
    '/api/auth/callback/google?code=oauth-code&state=oauth-state',
    '/api/auth/callback/facebook?code=oauth-code&state=oauth-state',
    '/api/auth/session',
    '/api/auth/signout',
  ])('bypasses auth guards for Auth.js route %s', async path => {
    const response = await middleware(createRequest(path))

    expectNext(response)
    expect(authMock).not.toHaveBeenCalled()
  })

  //https://www.somoswedin.com/api/authentication-status ->
  //unchanged (API route, not an authentication page)
  it('keeps an unrelated API prefix out of page authentication redirects', async () => {
    const response = await middleware(
      createRequest('/api/authentication-status')
    )

    expectNext(response)
    expect(authMock).not.toHaveBeenCalled()
  })

  // POST https://www.somoswedin.com/api/webhooks/pagopar ->
  // unchanged (Pagopar webhook handles the request)
  it('bypasses auth guards for the Pagopar webhook POST', async () => {
    const response = await middleware(
      createRequest('/api/webhooks/pagopar', {
        method: 'POST',
      })
    )

    expectNext(response)
    expect(authMock).not.toHaveBeenCalled()
  })

  // POST https://www.somoswedin.com/api/webhooks/pagopar/ ->
  // unchanged (the trailing slash must not trigger an auth redirect)
  it('bypasses auth guards for the Pagopar webhook with a trailing slash', async () => {
    const response = await middleware(
      createRequest('/api/webhooks/pagopar/', {
        method: 'POST',
      })
    )

    expectNext(response)
    expect(authMock).not.toHaveBeenCalled()
  })

  // https://www.somoswedin.com{path} ->
  // unchanged (public Pagopar return page
  it.each([
    '/checkout/pagopar/result/order-hash',
    '/checkout/pagopar/result/order-hash?stub=1',
  ])('keeps the public Pagopar result route reachable at %s', async path => {
    const response = await middleware(createRequest(path))

    expectNext(response)
    expect(authMock).not.toHaveBeenCalled()
  })

  // https://amelie-y-john.somoswedin.com/api/example ->
  // unchanged (must not rewrite to /e/amelie-y-john/api/example)
  it('does not rewrite an API request made on an event host', async () => {
    authMock.mockResolvedValue(null)

    const response = await middleware(
      createRequest('/api/example', {
        origin: 'https://amelie-y-john.somoswedin.com',
      })
    )

    expectNext(response)
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
  })

  // https://www.somoswedin.com{path} ->
  // unchanged (API/RPC responses must never redirect to /login or /onboarding)
  it.each([
    '/api',
    '/api/example?input=value',
    '/trpc',
    '/trpc/example?batch=1',
  ])('does not redirect the API/RPC request %s to an HTML page', async path => {
    const response = await middleware(createRequest(path))

    expectNext(response)
    expect(response.headers.get('location')).toBeNull()
    expect(authMock).not.toHaveBeenCalled()
  })
})

describe('middleware authentication redirects', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'somoswedin.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.somoswedin.com'
    process.env.ADMIN_SESSION_SECRET = 'test-admin-session-secret'
    authMock.mockResolvedValue(null)
  })

  // https://www.somoswedin.com{path} -> https://www.somoswedin.com/login
  it.each([
    '/dashboard',
    '/event-settings',
    '/gifts',
    '/gifts/lists/package-id',
    '/onboarding',
    '/onboarding/step-one',
    '/admin',
    '/admin/users',
  ])('sends an unauthenticated user from %s to login', async path => {
    const response = await middleware(createRequest(path))

    expect(response.status).toBe(307)
    expect(getRedirectUrl(response).pathname).toBe('/login')
  })

  // https://www.somoswedin.com{path} -> unchanged (public authentication route)
  it.each(['/login', '/error'])(
    'allows an unauthenticated user to access %s',
    async path => {
      const response = await middleware(createRequest(path))

      expectNext(response)
    }
  )

  // https://www.somoswedin.com/dashboard -> https://www.somoswedin.com/onboarding
  it('sends an onboarding user to onboarding from the dashboard', async () => {
    authMock.mockResolvedValue(onboardingUser)

    const response = await middleware(createRequest('/dashboard'))

    expect(getRedirectUrl(response).pathname).toBe('/onboarding')
  })

  // https://www.somoswedin.com/onboarding -> unchanged (the user still needs to complete onboarding)
  it('allows an onboarding user to remain on onboarding', async () => {
    authMock.mockResolvedValue(onboardingUser)

    expectNext(await middleware(createRequest('/onboarding')))
  })

  // https://www.somoswedin.com{path} -> https://www.somoswedin.com/dashboard
  it.each(['/login', '/onboarding'])(
    'sends an onboarded user from %s to the dashboard',
    async path => {
      authMock.mockResolvedValue(onboardedUser)

      const response = await middleware(createRequest(path))

      expect(getRedirectUrl(response).pathname).toBe('/dashboard')
    }
  )

  // https://www.somoswedin.com/event-settings -> unchanged (authenticated and onboarded)
  it('allows an onboarded user to access a protected route', async () => {
    authMock.mockResolvedValue(onboardedUser)

    expectNext(await middleware(createRequest('/event-settings')))
  })

  // https://www.somoswedin.com/admin -> https://www.somoswedin.com/dashboard
  it('sends a non-admin user away from admin routes', async () => {
    authMock.mockResolvedValue(onboardedUser)

    const response = await middleware(createRequest('/admin'))

    expect(getRedirectUrl(response).pathname).toBe('/dashboard')
  })

  // https://www.somoswedin.com/admin -> unchanged (ADMIN role + admin step-up cookie)
  it('allows an admin user with a step-up session to access admin routes', async () => {
    authMock.mockResolvedValue(adminUser)

    const response = await middleware(
      createRequest('/admin', { cookies: await adminCookies() })
    )

    expectNext(response)
  })

  // https://www.somoswedin.com/admin -> https://www.somoswedin.com/admin/login
  it('sends an admin without a step-up session to the admin login', async () => {
    authMock.mockResolvedValue(adminUser)

    const response = await middleware(createRequest('/admin'))

    expect(getRedirectUrl(response).pathname).toBe('/admin/login')
  })

  // https://www.somoswedin.com/admin/login -> unchanged (needs to enter the code)
  it('allows an admin without a step-up session to reach the admin login', async () => {
    authMock.mockResolvedValue(adminUser)

    expectNext(await middleware(createRequest('/admin/login')))
  })

  // https://www.somoswedin.com/admin/login -> https://www.somoswedin.com/admin
  it('sends an already verified admin from the admin login to the panel', async () => {
    authMock.mockResolvedValue(adminUser)

    const response = await middleware(
      createRequest('/admin/login', { cookies: await adminCookies() })
    )

    expect(getRedirectUrl(response).pathname).toBe('/admin')
  })

  // A step-up cookie is worthless without the Auth.js session it was bound to.
  it('rejects a step-up cookie without its bound auth session', async () => {
    authMock.mockResolvedValue(adminUser)

    const { wedin_admin } = await adminCookies()

    const response = await middleware(
      createRequest('/admin', { cookies: { wedin_admin } })
    )

    expect(getRedirectUrl(response).pathname).toBe('/admin/login')
  })

  it('rejects a step-up cookie bound to a different auth session', async () => {
    authMock.mockResolvedValue(adminUser)

    const cookies = await adminCookies()

    const response = await middleware(
      createRequest('/admin', {
        cookies: { ...cookies, 'authjs.session-token': 'other-session' },
      })
    )

    expect(getRedirectUrl(response).pathname).toBe('/admin/login')
  })

  // https://www.somoswedin.com/admin -> not the onboarding wizard: staff accounts
  // are flagged by hand and default to isOnboarded: false.
  it('does not send an admin who has not onboarded into onboarding', async () => {
    authMock.mockResolvedValue(onboardingAdminUser)

    const response = await middleware(
      createRequest('/admin', { cookies: await adminCookies() })
    )

    expectNext(response)
  })

  it('still sends an admin who has not onboarded to the admin login first', async () => {
    authMock.mockResolvedValue(onboardingAdminUser)

    const response = await middleware(createRequest('/admin'))

    expect(getRedirectUrl(response).pathname).toBe('/admin/login')
  })

  // https://www.somoswedin.com/login -> unchanged (prevents a /login redirect loop)
  it('never redirects login back to itself', async () => {
    authMock.mockResolvedValue(null)

    const response = await middleware(createRequest('/login'))

    expectNext(response)
    expect(response.headers.get('location')).toBeNull()
  })

  // https://www.somoswedin.com{path} -> unchanged (similar text is not an exact protected-route segment)
  it.each(['/dashboardish', '/administrator', '/onboarding-preview'])(
    'does not treat the route prefix %s as a protected route',
    async path => {
      const response = await middleware(createRequest(path))

      expectNext(response)
      expect(response.headers.get('location')).toBeNull()
    }
  )
})
