'use client'

import { ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { IoLinkOutline } from 'react-icons/io5'
import DownloadQrButton from '@/components/dashboard/download-qr-button'
import EventUrlForm from '@/components/forms/dashboard/event-url'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToggleEventPublished } from '@/hooks/dashboard/use-toggle-event-published'
import { useToast } from '@/hooks/use-toast'
import { getPublicEventUrl } from '@/lib/event-domain'
import { TERMS_PATHS } from '@/lib/terms'
import type { CompletedEvent } from './dashboard-home'

type DashboardHomeSiteLinkCardProps = {
  event: CompletedEvent
}

export default function DashboardHomeSiteLinkCard({
  event,
}: DashboardHomeSiteLinkCardProps) {
  const { toast } = useToast()

  const [currentUrl, setCurrentUrl] = useState(event.url)

  const {
    isPublished,
    hasAcceptedTerms,
    loading: publishLoading,
    toggle,
  } = useToggleEventPublished({
    eventId: event.id,
    isPublished: event.isPublished,
    hasAcceptedTerms: event.termsAcceptedAt !== null || event.isPublished,
  })

  const guestUrl = getPublicEventUrl(currentUrl)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl)

      toast({
        title: 'Enlace copiado al portapapeles 🔗',
      })
    } catch (error) {
      toast({
        title: 'No pudimos copiar el enlace',
        description: 'Copiá la dirección desde la barra del navegador.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 rounded-lg border border-borderDefault bg-gray-50 px-6 py-8">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-medium">Link de tu sitio web wedin</h2>

          {hasAcceptedTerms && (
            <p className="text-sm text-textTertiary">
              Compartí este link con tus invitados
            </p>
          )}
        </div>

        <EventUrlForm
          eventId={event.id}
          url={currentUrl}
          onUrlUpdated={setCurrentUrl}
        />
      </div>

      {hasAcceptedTerms ? (
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Switch
              checked={isPublished}
              disabled={publishLoading}
              onCheckedChange={toggle}
            />

            <span className="font-medium">Web visible</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <DownloadQrButton
              url={guestUrl}
              fileName={`wedin-${currentUrl ?? 'sitio'}-qr`}
            />

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleShare}
            >
              <span className="sm:hidden">Copiar</span>

              <span className="hidden sm:inline">Copiar link de tu sitio</span>

              <IoLinkOutline className="text-lg" />
            </Button>

            <Button variant="success" className="gap-2" asChild>
              <Link href={guestUrl} target="_blank" rel="noopener noreferrer">
                <span className="sm:hidden">Ver sitio</span>

                <span className="hidden sm:inline">Ver sitio web</span>

                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="success"
            className="shrink-0"
            disabled={publishLoading}
            onClick={() => toggle(true)}
          >
            {publishLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Activar lista'
            )}
          </Button>

          <p className="text-sm text-textTertiary">
            Al activar tu lista de regalos aceptás las{' '}
            <Link
              href={TERMS_PATHS.organizers}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              bases y condiciones
            </Link>{' '}
            y que wedin descuente el valor de la comisión al recibir tus
            regalos.
          </p>
        </div>
      )}
    </div>
  )
}
