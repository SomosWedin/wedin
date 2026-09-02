import type { PrismaClient } from '@prisma/client'

export async function up(prisma: PrismaClient) {
  await prisma.$runCommandRaw({
    update: 'Giftlist',
    updates: [
      {
        q: { eventTypeIds: { $exists: true } },
        u: { $unset: { eventTypeIds: '' } },
        multi: true,
      },
    ],
  })

  await prisma.$runCommandRaw({
    update: 'EventType',
    updates: [
      {
        q: { giftlistIds: { $exists: true } },
        u: { $unset: { giftlistIds: '' } },
        multi: true,
      },
    ],
  })
}
