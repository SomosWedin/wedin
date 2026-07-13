'use server';

import prismaClient from '@/prisma/client';

// Deliberately no `getCurrentUser()` import anywhere in this file — every
// function here backs the guest-facing `/e/[slug]` site and must stay
// reachable logged-out. Session-gated reads belong in `actions/data/event.ts`.

export async function getEventByUrl(slug: string) {
  try {
    const event = await prismaClient.event.findUnique({
      where: { url: slug },
      include: {
        images: true,
        users: true,
        _count: { select: { wishlistGifts: true } },
      },
    });

    if (!event) return null;

    // "Published" = has a url (guaranteed by the findUnique above) AND at
    // least one gift on the list — an event with no gifts yet has nothing
    // for a guest to see.
    if (event._count.wishlistGifts === 0) return null;

    return event;
  } catch (error) {
    console.error('Error retrieving event by url:', error);
    return null;
  }
}

export async function getPublicWishlistGifts(eventId: string) {
  try {
    return await prismaClient.wishlistGift.findMany({
      where: { eventId },
      include: {
        gift: { include: { image: true } },
        transactions: {
          where: { status: 'COMPLETED' },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error retrieving public wishlist gifts:', error);
    return [];
  }
}
