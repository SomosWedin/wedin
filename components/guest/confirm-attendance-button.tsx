'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { publicEventPaths } from '@/lib/event-domain'

export default function ConfirmAttendanceButton() {
  return (
    <Button variant="outline" size="lg" className="mt-4 w-fit" asChild>
      <Link href={publicEventPaths.invitados}>Confirmar asistencia</Link>
    </Button>
  )
}
