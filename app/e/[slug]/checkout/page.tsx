import { notFound } from 'next/navigation';
import { getEventByUrl } from '@/actions/data/public-event';
import CheckoutForm from '@/components/checkout/checkout-form';

type CheckoutPageProps = {
  params: { slug: string };
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const event = await getEventByUrl(params.slug);

  if (!event) notFound();

  return (
    <div className="px-4 py-6 sm:py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <h1 className="mb-4 sm:mb-8 text-2xl font-bold text-center">
        Datos del regalo y pago
      </h1>
      <CheckoutForm eventId={event.id} eventSlug={params.slug} />
    </div>
  );
}
