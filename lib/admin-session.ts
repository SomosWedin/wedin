import { jwtVerify, SignJWT } from 'jose'

export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60

const ADMIN_SESSION_ISSUER = 'wedin:admin'

export const AUTH_SESSION_COOKIE_NAMES = [
  '__Secure-authjs.session-token',
  'authjs.session-token',
] as const

export type AdminSessionClaims = {
  userId: string
  sessionBinding: string
}

export function getAdminSessionCookieName() {
  return process.env.NODE_ENV === 'production'
    ? '__Host-wedin_admin'
    : 'wedin_admin'
}

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured.')
  }

  return new TextEncoder().encode(secret)
}

export async function hashSessionBinding(sessionToken: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(sessionToken)
  )

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function signAdminSession({
  userId,
  sessionBinding,
}: AdminSessionClaims) {
  return await new SignJWT({ sessionBinding })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ADMIN_SESSION_ISSUER)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function verifyAdminSession(
  token: string | undefined,
  sessionBinding: string | null
): Promise<AdminSessionClaims | null> {
  if (!token || !sessionBinding) return null

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ADMIN_SESSION_ISSUER,
    })

    if (!payload.sub || payload.sessionBinding !== sessionBinding) {
      return null
    }

    return {
      userId: payload.sub,
      sessionBinding,
    }
  } catch {
    return null
  }
}
