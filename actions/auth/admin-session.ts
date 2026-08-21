import { cookies } from 'next/headers'
import { getCurrentUser } from '@/actions/get-current-user'
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  AUTH_SESSION_COOKIE_NAMES,
  getAdminSessionCookieName,
  hashSessionBinding,
  signAdminSession,
  verifyAdminSession,
} from '@/lib/admin-session'

async function getSessionBinding() {
  const cookieStore = await cookies()

  for (const name of AUTH_SESSION_COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value

    if (value) return await hashSessionBinding(value)
  }

  return null
}

export async function getAdminSessionUser() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') return null

  const cookieStore = await cookies()

  const token = cookieStore.get(getAdminSessionCookieName())?.value

  const claims = await verifyAdminSession(token, await getSessionBinding())

  if (claims?.userId !== currentUser.id) return null

  return currentUser
}

export async function hasAdminSession() {
  return (await getAdminSessionUser()) !== null
}

export async function startAdminSession(userId: string) {
  const sessionBinding = await getSessionBinding()

  if (!sessionBinding) return false

  const token = await signAdminSession({ userId, sessionBinding })

  const cookieStore = await cookies()

  cookieStore.set(getAdminSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })

  return true
}

export async function clearAdminSession() {
  const cookieStore = await cookies()

  cookieStore.delete(getAdminSessionCookieName())
}
