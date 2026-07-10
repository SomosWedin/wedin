import { notFound } from 'next/navigation';
import {
  getEventByUrl,
  getPublicWishlistGifts,
} from '@/actions/data/public-event';
import { getCategories } from '@/actions/data/category';
import GuestHero from '@/components/guest/guest-hero';
import GuestGiftCatalog from '@/components/guest/guest-gift-catalog';

type GuestEventPageProps = {
  params: { slug: string };
};

export default async function GuestEventPage({ params }: GuestEventPageProps) {
  const event = await getEventByUrl(params.slug);

  if (!event) notFound();

  const [wishlistGifts, categories] = await Promise.all([
    getPublicWishlistGifts(event.id),
    getCategories(),
  ]);

  return (
    <>
      <GuestHero event={event} />
      <GuestGiftCatalog wishlistGifts={wishlistGifts} categories={categories} />
    </>
  );
}
