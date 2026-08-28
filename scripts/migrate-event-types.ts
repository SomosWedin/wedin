const { PrismaClient } = require('@prisma/client')
const {
  SYSTEM_EVENT_TYPES: systemEventTypes,
}: {
  SYSTEM_EVENT_TYPES: Record<'WEDDING' | 'OTHER', { key: string; name: string }>
} = require('../lib/event-type')

const prisma = new PrismaClient()

const SYSTEM_EVENT_TYPES = [
  { ...systemEventTypes.WEDDING, legacyValue: 'WEDDING' },
  { ...systemEventTypes.OTHER, legacyValue: 'OTHER' },
]

async function main() {
  await Promise.all(
    SYSTEM_EVENT_TYPES.map(({ key, name }) =>
      prisma.eventType.upsert({
        where: { key },
        update: { name },
        create: { key, name },
      })
    )
  )

  const rawEventTypes = await prisma.$runCommandRaw({
    find: 'EventType',
    filter: {
      key: { $in: SYSTEM_EVENT_TYPES.map(eventType => eventType.key) },
    },
  })

  for (const eventType of rawEventTypes.cursor.firstBatch) {
    const definition = SYSTEM_EVENT_TYPES.find(
      candidate => candidate.key === eventType.key
    )
    if (!definition) continue

    await prisma.$runCommandRaw({
      update: 'Event',
      updates: [
        {
          q: { eventType: definition.legacyValue },
          u: {
            $set: { eventTypeId: eventType._id },
            $unset: { eventType: '' },
          },
          multi: true,
        },
      ],
    })

    await prisma.$runCommandRaw({
      update: 'Category',
      updates: [
        {
          q: { eventType: definition.legacyValue },
          u: {
            $set: { eventTypeIds: [eventType._id] },
            $unset: { eventType: '' },
          },
          multi: true,
        },
      ],
    })

    const rawCategories = await prisma.$runCommandRaw({
      find: 'Category',
      filter: { eventTypeIds: eventType._id },
      projection: { _id: 1 },
    })

    await prisma.$runCommandRaw({
      update: 'EventType',
      updates: [
        {
          q: { _id: eventType._id },
          u: {
            $set: {
              categoryIds: rawCategories.cursor.firstBatch.map(
                (category: { _id: unknown }) => category._id
              ),
              giftlistIds: [],
            },
          },
        },
      ],
    })
  }

  await prisma.$runCommandRaw({
    update: 'Category',
    updates: [
      {
        q: { eventTypeIds: { $exists: false } },
        u: { $set: { eventTypeIds: [] }, $unset: { eventType: '' } },
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

  try {
    await prisma.$runCommandRaw({
      dropIndexes: 'Category',
      index: 'Category_name_eventType_key',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('index not found')) throw error
  }

  console.log(
    'Event types migrated. Giftlist types remain empty until an admin assigns compatible types.'
  )
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export {}
