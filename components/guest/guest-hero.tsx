import {
  type Event,
  EventType,
  type Image as ImageModel,
  type User,
} from '@prisma/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import GuestImageCarousel from '@/components/guest/guest-image-carousel'
import ViewGiftsButton from '@/components/guest/view-gifts-button'

type GuestHeroProps = {
  event: Event & { images: Pick<ImageModel, 'id' | 'url'>[]; users: User[] }
}

export default function GuestHero({ event }: GuestHeroProps) {
  const primaryUser = event.users.find(user => user.isPrimary) ?? event.users[0]
  const secondaryUser = event.users.find(user => !user.isPrimary)

  const coupleName =
    event.eventType === EventType.WEDDING && secondaryUser?.name
      ? `${primaryUser?.name ?? ''} & ${secondaryUser.name}`.trim()
      : (primaryUser?.name ?? event.name ?? 'Nuestro evento')

  const dateLabel = event.date
    ? event.eventType === EventType.WEDDING
      ? `Nos casamos el ${format(event.date, "d 'de' MMMM 'de' yyyy", { locale: es })}`
      : `El evento es el ${format(event.date, "d 'de' MMMM 'de' yyyy", { locale: es })}`
    : null

  return (
    <div className="bg-gray-50">
      <section className="grid grid-cols-1 gap-0 lg:gap-4 items-center mx-auto max-w-7xl lg:grid-cols-2">
        <div className="w-full aspect-[1/1] px-0 sm:px-4 py-0 sm:py-8">
          <GuestImageCarousel images={event.images} />
        </div>

        <div className="flex flex-col gap-4 sm:gap-8 px-4 py-6 lg:py-0">
          {dateLabel && (
            <span className="inline-flex gap-2 items-center py-0.5 px-3 w-fit font-medium text-sm rounded-full bg-success/10 text-success shadow-sm">
              {dateLabel} <span className="text-base">📅</span>
            </span>
          )}
          <h1 className="text-4xl font-semibold sm:text-5xl">{coupleName}</h1>
          {event.coverMessage && (
            <p className="text-textTertiary font-light">{event.coverMessage}</p>
          )}
          <ViewGiftsButton />
        </div>
      </section>
    </div>
  )
}
