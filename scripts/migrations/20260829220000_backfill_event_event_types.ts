import type { Prisma, PrismaClient } from '@prisma/client'

type RawEventType = { _id: Prisma.InputJsonValue }

function firstBatch<T>(result: Prisma.JsonObject) {
  return (result as unknown as { cursor: { firstBatch: T[] } }).cursor
    .firstBatch
}

export async function up(prisma: PrismaClient) {
  // Historical migrations keep their own immutable values so future seed
  // renames cannot change what an already checksummed migration does.
  await prisma.eventType.upsert({
    where: { key: 'wedding' },
    update: {},
    create: { key: 'wedding', name: 'Casamiento' },
  })

  const rawEventTypes = await prisma.$runCommandRaw({
    find: 'EventType',
    filter: { key: 'wedding' },
    projection: { _id: 1 },
  })
  const wedding = firstBatch<RawEventType>(rawEventTypes)[0]
  if (!wedding) throw new Error('Wedding event type was not created.')

  await prisma.$runCommandRaw({
    update: 'Event',
    updates: [
      {
        q: {
          $or: [{ eventTypeId: { $exists: false } }, { eventTypeId: null }],
        },
        u: { $set: { eventTypeId: wedding._id } },
        multi: true,
      },
    ],
  })

  const remaining = await prisma.$runCommandRaw({
    count: 'Event',
    query: {
      $or: [{ eventTypeId: { $exists: false } }, { eventTypeId: null }],
    },
  })
  const missingCount = Number((remaining as Prisma.JsonObject).n ?? 0)
  if (missingCount > 0) {
    throw new Error(`${missingCount} event(s) still have no event type.`)
  }
}
