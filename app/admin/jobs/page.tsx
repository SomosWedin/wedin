import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/actions/get-current-user'
import AdminImportJobs from '@/components/admin/admin-import-jobs'

export default async function AdminJobsPage() {
  if ((await getCurrentUser())?.role !== 'ADMIN') redirect('/dashboard')
  return (
    <div className="container space-y-6 p-4 sm:p-8">
      <Link href="/admin" className="text-sm underline">
        Volver al panel de staff
      </Link>
      <h1 className="text-2xl font-black">Trabajos de importación</h1>
      <AdminImportJobs />
    </div>
  )
}
