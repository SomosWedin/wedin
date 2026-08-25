'use server'

import prismaClient from '@/prisma/client'

export async function getEventByUrl(slug: string) {
  try {
    const event = await prismaClient.event.findUnique({
      where: { url: slug },
      include: {
        images: true,
        users: true,
        _count: { select: { wishlistGifts: true } },
      },
    })

    if (!event) return null

    // "Published" = has a url (guaranteed by the findUnique above) AND at
    // least one gift on the list — an event with no gifts yet has nothing
    // for a guest to see.
    if (event._count.wishlistGifts === 0) return null

    return event
  } catch (error) {
    console.error('Error retrieving event by url:', error)
    return null
  }
}

export async function getPublicWishlistGifts(eventId: string) {
  try {
    return await prismaClient.wishlistGift.findMany({
      where: { eventId, isReceived: false },
      include: {
        gift: { include: { image: true } },
        transactions: {
          where: { status: 'COMPLETED' },
          select: { amount: true, quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error retrieving public wishlist gifts:', error)
    return []
  }
}
