import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ImportJobError({
  message,
  queueDispatchFailed,
}: {
  message: string
  queueDispatchFailed: boolean
}) {
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-md border border-error/30 bg-red-50 p-3 text-sm text-red-700"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-2">
        <p>{message}</p>
        {queueDispatchFailed && (
          <p>
            Abrí{' '}
            <Link href="/admin/jobs" className="font-medium underline">
              Trabajos de importación
            </Link>{' '}
            y seleccioná “Reintentar pendientes y fallidos”.
          </p>
        )}
      </div>
    </div>
  )
}
