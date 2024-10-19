import EventDetailsUpdateForm from '@/components/forms/dashboard/event-details-update-form';
import {  Event } from '@prisma/client';

type DashboardEventDetailsProps = {
  event: Event | null;
};

export default function DashboardEventDetails( { event }: DashboardEventDetailsProps ) {

  if (!event) {
    return null;
  }

  return (
    <section className="w-full h-full flex justify-start items-center flex-col gap-12">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Presentación</h1>
        <p className="text-textTertiary">
          Haz que tu evento brille: sube fotos y cuenta de qué se trata, para
          que tus invitados se emocionen.
        </p>
      </div>

      <EventDetailsUpdateForm eventId={event.id} imagesUrls={event.images} />
    </section>
  );
}
