const { PrismaClient } = require('@prisma/client')
const { faker } = require('@faker-js/faker')
const {
  SYSTEM_EVENT_TYPES: systemEventTypes,
}: {
  SYSTEM_EVENT_TYPES: Record<'WEDDING' | 'OTHER', { key: string; name: string }>
} = require('../lib/event-type')

const prismaSeed = new PrismaClient()

const categorySeeds: {
  name: string
  eventType: keyof typeof systemEventTypes
}[] = [
  { name: 'Luna de miel', eventType: 'WEDDING' },
  { name: 'Muebles y decoraciones', eventType: 'WEDDING' },
  { name: 'Cama y cocina', eventType: 'WEDDING' },
  { name: 'Construcciones y reformas', eventType: 'WEDDING' },
  { name: 'Entrada en departamento', eventType: 'WEDDING' },
  { name: 'Baby shower', eventType: 'OTHER' },
  { name: '15 años', eventType: 'OTHER' },
  { name: 'Cumpleaños', eventType: 'OTHER' },
  { name: 'Aniversarios', eventType: 'OTHER' },
]

async function main() {
  // Delete existing data in a specific order due to foreign key constraints
  // await prismaClient.gift.deleteMany();
  // await prismaClient..deleteMany();
  // await prismaClient.category.deleteMany();

  const eventTypes = await Promise.all(
    Object.values(systemEventTypes).map(eventType =>
      prismaSeed.eventType.upsert({
        where: { key: eventType.key },
        update: { name: eventType.name },
        create: eventType,
      })
    )
  )
  const eventTypeIdByKey = new Map(
    eventTypes.map(eventType => [eventType.key, eventType.id])
  )

  // Seed categories. Categories sharing a name must have disjoint event types.
  const categories = await Promise.all(
    categorySeeds.map(async ({ name, eventType }) => {
      const eventTypeId = eventTypeIdByKey.get(systemEventTypes[eventType].key)
      if (!eventTypeId) throw new Error(`Missing event type: ${eventType}`)

      const existing = await prismaSeed.category.findFirst({
        where: {
          name,
          eventTypeIds: { has: eventTypeId },
        },
      })

      return existing
        ? prismaSeed.category.update({
            where: { id: existing.id },
            data: { eventTypes: { connect: { id: eventTypeId } } },
          })
        : prismaSeed.category.create({
            data: {
              name,
              eventTypes: { connect: { id: eventTypeId } },
            },
          })
    })
  )

  // Seed gift lists
  const giftlists = await Promise.all(
    categories.map(async category => {
      const giftlist = await prismaSeed.giftlist.create({
        data: {
          name: `${category.name} Package`,
          normalizedName: `${category.name} Package`
            .trim()
            .toLocaleLowerCase('es-PY'),
          eventTypes: {
            connect: category.eventTypeIds.map((id: string) => ({ id })),
          },
        },
      })

      return { giftlist, categoryId: category.id }
    })
  )

  // Seed gifts and assign to gift lists
  for (let i = 0; i < 150; i++) {
    const randomGiftlist = faker.helpers.arrayElement(giftlists)
    const price = faker.number.int({ min: 89000, max: 1820000 }).toString()

    await prismaSeed.gift.create({
      data: {
        name: faker.commerce.productName(),
        isDefault: true,
        price: price,
        giftlist: {
          connect: { id: randomGiftlist.giftlist.id },
        },
        category: {
          connect: { id: randomGiftlist.categoryId },
        },
        image: {
          create: {
            url: faker.image.url(),
          },
        },
      },
    })
  }

  console.log('Database has been seeded. 🌱')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaSeed.$disconnect()
  })
