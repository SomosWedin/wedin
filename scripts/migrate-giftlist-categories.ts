const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const duplicates = await prisma.$runCommandRaw({
    aggregate: 'Giftlist',
    pipeline: [
      {
        $project: {
          name: 1,
          normalizedName: {
            $toLower: { $trim: { input: '$name' } },
          },
        },
      },
      {
        $group: {
          _id: '$normalizedName',
          names: { $addToSet: '$name' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
    cursor: {},
  })

  const duplicateNames = duplicates.cursor.firstBatch

  if (duplicateNames.length > 0) {
    throw new Error(
      `Colecciones duplicadas: ${duplicateNames
        .map((duplicate: { names: string[] }) => duplicate.names.join(' / '))
        .join(', ')}. Renombrálas o consolidalas antes de migrar.`
    )
  }

  await prisma.$runCommandRaw({
    update: 'Giftlist',
    updates: [
      {
        q: {},
        u: [
          {
            $set: {
              normalizedName: {
                $toLower: { $trim: { input: '$name' } },
              },
            },
          },
          { $unset: 'categoryId' },
        ],
        multi: true,
      },
    ],
  })

  try {
    await prisma.$runCommandRaw({
      dropIndexes: 'Giftlist',
      index: 'Giftlist_categoryId_idx',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('index not found')) throw error
  }

  console.log(
    'Giftlists migrated. Run prisma db push to create the normalizedName unique index.'
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
