import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAdminSessionUser } from '@/actions/auth/admin-session'
import { getCurrentUser } from '@/actions/get-current-user'
import AdminOtpForm from '@/components/forms/auth/admin-otp-form'
import logoImg from '@/public/assets/w-logo.svg'

function maskEmail(email: string) {
  const [name, domain] = email.split('@')

  if (!domain) return email

  const visible = name.slice(0, 1)

  return `${visible}${'*'.repeat(Math.max(name.length - 1, 1))}@${domain}`
}

export default async function AdminLoginPage() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN' || !currentUser.email) {
    redirect('/dashboard')
  }

  if (await getAdminSessionUser()) {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-4">
        <Image src={logoImg} alt="Logo" className="w-32" />

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-black text-textPrimary">
            Panel de staff
          </h1>

          <p className="text-center text-textTertiary">
            Necesitás un código de acceso para continuar.
          </p>
        </div>
      </div>

      <AdminOtpForm maskedEmail={maskEmail(currentUser.email)} />
    </div>
  )
}
