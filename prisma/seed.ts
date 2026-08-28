const { PrismaClient } = require('@prisma/client')
const { faker } = require('@faker-js/faker')

const prismaSeed = new PrismaClient()

async function main() {
  // Delete existing data in a specific order due to foreign key constraints
  // await prismaClient.gift.deleteMany();
  // await prismaClient..deleteMany();
  // await prismaClient.category.deleteMany();

  // Seed categories
  const categories = await Promise.all(
    [
      { name: 'Luna de miel', eventType: 'WEDDING' },
      { name: 'Muebles y decoraciones', eventType: 'WEDDING' },
      { name: 'Cama y cocina', eventType: 'WEDDING' },
      { name: 'Construcciones y reformas', eventType: 'WEDDING' },
      { name: 'Entrada en departamento', eventType: 'WEDDING' },
      { name: 'Baby shower', eventType: 'OTHER' },
      { name: '15 años', eventType: 'OTHER' },
      { name: 'Cumpleaños', eventType: 'OTHER' },
      { name: 'Aniversarios', eventType: 'OTHER' },
    ].map(async ({ name, eventType }) => {
      return prismaSeed.category.upsert({
        where: { name_eventType: { name, eventType } },
        update: {},
        create: { name, eventType },
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
        categoryId: randomGiftlist.categoryId,
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
