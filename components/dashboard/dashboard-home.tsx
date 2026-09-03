import type { Event } from '@prisma/client'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { FaCheck, FaChevronRight } from 'react-icons/fa6'
import { getEvent } from '@/actions/data/event'
import { getWishlistGifts } from '@/actions/data/wishlist-gift'
import DashboardHomeSiteLinkCard from '@/components/dashboard/dashboard-home-site-link-card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { hasAcceptedOrganizerTerms } from '@/lib/terms'
import { cn } from '@/lib/utils'

type ChecklistItem = {
  label: string
  completed: boolean
  href?: string
}

export type CompletedEvent = Event & {
  url: string
}

export function hasEventUrl(event: Event): event is CompletedEvent {
  return typeof event.url === 'string' && event.url.trim().length > 0
}

export default async function DashboardHome() {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return <div>Error</div>
  }

  const wishlistGifts = await getWishlistGifts({
    searchParams: { wishlistId: event.wishlistId },
  })

  const hasGift = wishlistGifts.length > 0
  const hasPresentation = !!event.coverMessage
  const hasEventDetails = !!event.date && !!event.url

  const items: ChecklistItem[] = [
    {
      label: 'Completá el onboarding',
      completed: true,
    },
    {
      label: 'Agregá un regalo a tu lista',
      completed: hasGift,
      href: '/gifts',
    },
    {
      label: 'Completá la presentación de tu evento',
      completed: hasPresentation,
      href: '/event-details',
    },
    {
      label: 'Completá los detalles de tu evento',
      completed: hasEventDetails,
      href: '/event-settings',
    },
  ]

  const completedCount = items.filter(item => item.completed).length
  const progressValue = (completedCount / items.length) * 100
  const allChecklistItemsCompleted = completedCount === items.length
  const completedEvent =
    allChecklistItemsCompleted && hasEventUrl(event) ? event : null

  const allCompleted = completedEvent !== null
  const isActivated = hasAcceptedOrganizerTerms(event)

  return (
    <section className="w-full h-full flex flex-col justify-start items-center gap-8">
      <div className="w-full flex flex-col gap-2 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Inicio</h1>
        <p className="text-textTertiary">
          {!allCompleted
            ? 'Configura tu página y sigue los pasos para tener todo listo para tu evento'
            : isActivated
              ? 'Tu página está lista, compartila con tus invitados'
              : 'Ya casi está, activá tu lista para compartirla con tus invitados'}
        </p>
      </div>

      {allCompleted ? (
        <DashboardHomeSiteLinkCard event={completedEvent} />
      ) : (
        <div className="border border-borderDefault bg-gray-50 w-full rounded-lg px-6 py-8">
          <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center border-b border-gray-200 pb-6 gap-4">
            <h2 className="text-xl font-medium">
              Completá los campos para publicar la página
            </h2>
            <div className="flex items-center">
              <p className="text-xs w-60">
                {completedCount} de {items.length} completado
              </p>
              <Progress value={progressValue} />
            </div>
          </div>

          <div className="flex flex-col gap-5 mt-6">
            {items.map(item => {
              const row = (
                <div className="flex justify-between items-center border-b border-gray-200 pb-5">
                  <div className="flex items-center">
                    {item.completed ? (
                      <FaCheck className="text-2xl" />
                    ) : (
                      <div className="rounded-full w-6 pl-2">
                        <div className="rounded-full w-1.5 h-1.5 bg-black"></div>
                      </div>
                    )}
                    <p
                      className={cn(
                        'font-medium pl-3',
                        item.completed && 'line-through text-textTertiary'
                      )}
                    >
                      {item.label}
                    </p>
                  </div>
                  <FaChevronRight className="text-lg" />
                </div>
              )

              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="hover:opacity-70 transition-opacity"
                >
                  {row}
                </Link>
              ) : (
                <div key={item.label}>{row}</div>
              )
            })}

            <div className="flex mt-4">
              <Button variant="success" className="gap-2" disabled>
                Ver sitio web
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
