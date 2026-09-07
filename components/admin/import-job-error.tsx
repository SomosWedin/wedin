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
      className="space-y-2 rounded-md bg-red-50 p-3 text-sm text-red-700"
    >
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
  )
}
