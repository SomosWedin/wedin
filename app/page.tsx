import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/actions/get-current-user'

export default async function Home() {
  const currentUser = await getCurrentUser()

  if (currentUser) {
    redirect('/dashboard')
  }

  redirect('https://home.somoswedin.com')
}
