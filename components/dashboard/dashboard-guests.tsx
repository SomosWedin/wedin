import { lazy, Suspense } from 'react'
import { IoPeopleOutline } from 'react-icons/io5'
import { getEvent } from '@/actions/data/event'
import { getGuests } from '@/actions/data/guest'
import EmptyState from '@/components/common/empty-state'
import DashboardGuestsLinkCard from '@/components/dashboard/dashboard-guests-link-card'
import CreateGuestDialog from '@/components/dialog/create-guest-dialog'
import DashboardGuestsSkeleton from '@/components/skeletons/dashboard-guests'

const DashboardGuestsList = lazy(
  () => import('@/components/dashboard/dashboard-guests-list')
)

export default async function DashboardGuests() {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return <div>Error</div>
  }

  const guests = await getGuests({ searchParams: { eventId: event.id } })

  const header = (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black">Invitados</h1>
        <p className="text-textTertiary">
          Gestioná tu lista de invitados y llevá un registro de quién
          confirmó su asistencia.
        </p>
      </div>
      <CreateGuestDialog eventId={event.id} />
    </div>
  )

  if (guests.length === 0) {
    return (
      <div className="w-full h-full flex items-center flex-col gap-6">
        {header}
        {event.url && <DashboardGuestsLinkCard eventUrl={event.url} />}
        <EmptyState
          icon={<IoPeopleOutline className="text-6xl" />}
          title="Sin invitados"
          description="Todavía no agregaste invitados a tu lista"
        />
      </div>
    )
  }

  return (
    <div className="w-full h-full flex items-center flex-col gap-6">
      {header}
      {event.url && <DashboardGuestsLinkCard eventUrl={event.url} />}
      <Suspense fallback={<DashboardGuestsSkeleton />}>
        <DashboardGuestsList guests={guests} eventUrl={event.url} />
      </Suspense>
    </div>
  )
}
