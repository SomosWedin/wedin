import type { Prisma, PrismaClient } from '@prisma/client'

const EVENT_TYPES = [
  { key: 'wedding', name: 'Casamiento', legacyValue: 'WEDDING' },
  { key: 'other', name: 'Otro tipo de evento', legacyValue: 'OTHER' },
] as const

type RawEventType = { _id: Prisma.InputJsonValue; key?: string }
type RawCategory = { _id: Prisma.InputJsonValue }
type RawIndex = { name?: string }

function firstBatch<T>(result: Prisma.JsonObject) {
  return (result as unknown as { cursor: { firstBatch: T[] } }).cursor
    .firstBatch
}

function isMissingNamespace(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('NamespaceNotFound') ||
    message.includes('ns does not exist') ||
    message.includes('Code: 26')
  )
}

async function hasIndex(
  prisma: PrismaClient,
  collection: string,
  indexName: string
) {
  try {
    const indexes = await prisma.$runCommandRaw({ listIndexes: collection })
    return firstBatch<RawIndex>(indexes).some(index => index.name === indexName)
  } catch (error) {
    if (isMissingNamespace(error)) return false
    throw error
  }
}

export async function up(prisma: PrismaClient) {
  await Promise.all(
    EVENT_TYPES.map(({ key, name }) =>
      prisma.eventType.upsert({
        where: { key },
        update: {},
        create: { key, name },
      })
    )
  )

  const rawEventTypes = await prisma.$runCommandRaw({
    find: 'EventType',
    filter: { key: { $in: EVENT_TYPES.map(eventType => eventType.key) } },
  })

  for (const eventType of firstBatch<RawEventType>(rawEventTypes)) {
    const definition = EVENT_TYPES.find(
      candidate => candidate.key === eventType.key
    )
    if (!definition) continue

    await prisma.$runCommandRaw({
      update: 'Event',
      updates: [
        {
          q: {
            eventType: definition.legacyValue,
            $or: [{ eventTypeId: { $exists: false } }, { eventTypeId: null }],
          },
          u: {
            $set: { eventTypeId: eventType._id },
            $unset: { eventType: '' },
          },
          multi: true,
        },
        {
          q: {
            eventType: definition.legacyValue,
            eventTypeId: { $exists: true, $ne: null },
          },
          u: { $unset: { eventType: '' } },
          multi: true,
        },
      ],
    })

    await prisma.$runCommandRaw({
      update: 'Category',
      updates: [
        {
          q: { eventType: definition.legacyValue },
          u: [
            {
              $set: {
                eventTypeIds: {
                  $setUnion: [
                    { $ifNull: ['$eventTypeIds', []] },
                    [eventType._id],
                  ],
                },
              },
            },
            { $unset: 'eventType' },
          ],
          multi: true,
        },
      ],
    })

    const rawCategories = await prisma.$runCommandRaw({
      find: 'Category',
      filter: { eventTypeIds: eventType._id },
      projection: { _id: 1 },
    })
    const categoryIds = firstBatch<RawCategory>(rawCategories).map(
      category => category._id
    )

    await prisma.$runCommandRaw({
      update: 'EventType',
      updates: [
        {
          q: { _id: eventType._id },
          u: [
            {
              $set: {
                categoryIds: {
                  $setUnion: [{ $ifNull: ['$categoryIds', []] }, categoryIds],
                },
                giftlistIds: { $ifNull: ['$giftlistIds', []] },
              },
            },
          ],
        },
      ],
    })
  }

  await prisma.$runCommandRaw({
    update: 'Category',
    updates: [
      {
        q: {
          eventTypeIds: { $exists: false },
          eventType: { $exists: false },
        },
        u: { $set: { eventTypeIds: [] } },
        multi: true,
      },
    ],
  })

  await prisma.$runCommandRaw({
    update: 'Giftlist',
    updates: [
      {
        q: { eventTypeIds: { $exists: false } },
        u: { $set: { eventTypeIds: [] } },
        multi: true,
      },
    ],
  })

  if (await hasIndex(prisma, 'Category', 'Category_name_eventType_key')) {
    await prisma.$runCommandRaw({
      dropIndexes: 'Category',
      index: 'Category_name_eventType_key',
    })
  }
}
