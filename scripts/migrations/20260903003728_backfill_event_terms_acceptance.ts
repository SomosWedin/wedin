import type { Prisma, PrismaClient } from '@prisma/client'

export async function up(prisma: PrismaClient) {
  // Keep migrations idempotent so retrying after an interrupted run is safe.

  await prisma.$runCommandRaw({
    update: 'Event',
    updates: [
      {
        q: {
          $or: [{ isPublished: { $exists: false } }, { isPublished: null }],
        },
        u: { $set: { isPublished: true } },
        multi: true,
      },
    ],
  })

  await prisma.$runCommandRaw({
    update: 'Event',
    updates: [
      {
        q: {
          isPublished: true,
          $or: [
            { termsAcceptedAt: { $exists: false } },
            { termsAcceptedAt: null },
          ],
        },
        u: { $currentDate: { termsAcceptedAt: true } },
        multi: true,
      },
    ],
  })

  const remaining = await prisma.$runCommandRaw({
    count: 'Event',
    query: {
      isPublished: true,
      $or: [{ termsAcceptedAt: { $exists: false } }, { termsAcceptedAt: null }],
    },
  })

  const missingCount = Number((remaining as Prisma.JsonObject).n ?? 0)

  if (missingCount > 0) {
    throw new Error(
      `${missingCount} published event(s) still have no terms acceptance.`
    )
  }
}
