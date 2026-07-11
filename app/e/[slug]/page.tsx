import { notFound } from 'next/navigation';
import {
  getEventByUrl,
  getPublicWishlistGifts,
} from '@/actions/data/public-event';
import { getCategories } from '@/actions/data/category';
import GuestHero from '@/components/guest/guest-hero';
import GuestGiftCatalog from '@/components/guest/guest-gift-catalog';
import SiteUnavailable from '@/components/guest/site-unavailable';

type GuestEventPageProps = {
  params: { slug: string };
};

export default async function GuestEventPage({ params }: GuestEventPageProps) {
  const event = await getEventByUrl(params.slug);

  if (!event) notFound();

  if (!event.isPublished) return <SiteUnavailable />;

  const [wishlistGifts, categories] = await Promise.all([
    getPublicWishlistGifts(event.id),
    getCategories(),
  ]);

  return (
    <>
      <GuestHero event={event} />
      <GuestGiftCatalog
        eventId={event.id}
        wishlistGifts={wishlistGifts}
        categories={categories}
      />
    </>
  );
}
