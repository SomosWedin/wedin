import type { Prisma, PrismaClient } from '@prisma/client'

export async function up(prisma: PrismaClient) {
  // Keep migrations idempotent so retrying after an interrupted run is safe.

  // `isPublished` was added with `@default(true)` and never backfilled, so
  // documents older than it carry no such field and were reading as the schema
  // default. That default is now `false`, which would take those sites down.
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

  // Events already live before the términos y condiciones existed are treated as
  // having accepted them — that is what the dashboard used to infer from
  // `isPublished`. Recording it here instead lets `hasAcceptedOrganizerTerms`
  // read a single immutable field, so hiding a site can no longer revoke an
  // acceptance or trigger a silent re-stamp on the next activation.
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
