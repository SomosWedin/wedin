import { lazy, Suspense } from 'react'
import { getEvent } from '@/actions/data/event'
import DashboardEventCoverSkeleton from '@/components/skeletons/dashboard-event-details'

const EventCoverUpdateForm = lazy(
  () => import('@/components/forms/dashboard/event-cover')
)

export default async function DashboardEventCover() {
  const event = await getEvent()

  if (!event || 'error' in event) {
    return <div>Error</div>
  }

  return (
    <section className="w-full h-full flex flex-col gap-8 justify-start items-center">
      <div className="w-full flex flex-col gap-2 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Presentación</h1>
        <p className="text-textTertiary">
          Haz que tu evento brille: sube fotos y cuenta de qué se trata, para
          que tus invitados se emocionen.
        </p>
      </div>

      <Suspense fallback={<DashboardEventCoverSkeleton />}>
        <EventCoverUpdateForm event={event} />
      </Suspense>
    </section>
  )
}
