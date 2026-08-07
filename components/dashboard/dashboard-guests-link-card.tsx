'use client'

import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { IoLinkOutline } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getPublicEventUrl } from '@/lib/event-domain'

type DashboardGuestsLinkCardProps = {
  eventUrl: string
}

export default function DashboardGuestsLinkCard({
  eventUrl,
}: DashboardGuestsLinkCardProps) {
  const { toast } = useToast()

  const rsvpUrl = getPublicEventUrl(eventUrl, '/invitados')

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(rsvpUrl)

      toast({ title: 'Enlace copiado al portapapeles 🔗' })
    } catch (error) {
      toast({
        title: 'No pudimos copiar el enlace',
        description: 'Copiá la dirección desde la barra del navegador.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-borderDefault bg-gray-50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">
          Link para confirmar asistencia
        </h2>

        <p className="text-sm text-textTertiary">
          Compartí este link con tus invitados para que confirmen por su
          cuenta
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={handleShare}
        >
          Copiar link
          <IoLinkOutline className="text-lg" />
        </Button>

        <Button variant="success" className="gap-2" asChild>
          <Link href={rsvpUrl} target="_blank" rel="noopener noreferrer">
            Ver página
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
