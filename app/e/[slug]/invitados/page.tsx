import { notFound } from 'next/navigation'
import { getEventByUrl } from '@/actions/data/public-event'
import GuestRsvp from '@/components/guest/guest-rsvp'
import SiteUnavailable from '@/components/guest/site-unavailable'

type InvitadosPageProps = {
  params: { slug: string }
  searchParams: { g?: string }
}

export default async function InvitadosPage({
  params,
  searchParams,
}: InvitadosPageProps) {
  const event = await getEventByUrl(params.slug)

  if (!event) notFound()

  if (!event.isPublished) return <SiteUnavailable />

  return (
    <div className="px-4 py-8 sm:py-12 mx-auto max-w-7xl sm:px-6 lg:px-8 mt-12">
      <GuestRsvp
        eventId={event.id}
        eventSlug={params.slug}
        guestId={searchParams.g}
      />
    </div>
  )
}
