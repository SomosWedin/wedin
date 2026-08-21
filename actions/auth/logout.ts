'use server'

import { clearAdminSession } from '@/actions/auth/admin-session'
import { signOut } from '@/auth'

export default async function logout() {
  await clearAdminSession()

  await signOut({
    redirectTo: '/',
  })
}
