import type { PrismaClient } from '@prisma/client'
import { deriveGiftlistEventTypeIds } from '../../lib/giftlist-event-types'

export async function up(prisma: PrismaClient) {
  const giftlists = await prisma.giftlist.findMany({
    select: {
      id: true,
      gifts: { select: { category: { select: { eventTypeIds: true } } } },
    },
  })

  for (const giftlist of giftlists) {
    const eventTypeIds = deriveGiftlistEventTypeIds(giftlist.gifts)

    await prisma.giftlist.update({
      where: { id: giftlist.id },
      data: {
        eventTypes: { set: eventTypeIds.map(id => ({ id })) },
      },
    })
  }
}
