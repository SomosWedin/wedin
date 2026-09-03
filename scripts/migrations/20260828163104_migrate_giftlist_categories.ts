import type { Prisma, PrismaClient } from '@prisma/client'

type RawIndex = { name?: string }
type DuplicateName = { names: string[] }

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

  const duplicateNames = firstBatch<DuplicateName>(duplicates)
  if (duplicateNames.length > 0) {
    throw new Error(
      `Colecciones duplicadas: ${duplicateNames
        .map(duplicate => duplicate.names.join(' / '))
        .join(', ')}. Renombrálas o consolidalas antes de migrar.`
    )
  }

  await prisma.$runCommandRaw({
    update: 'Giftlist',
    updates: [
      {
        q: {
          $or: [
            { normalizedName: { $exists: false } },
            { categoryId: { $exists: true } },
          ],
        },
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

  if (await hasIndex(prisma, 'Giftlist', 'Giftlist_categoryId_idx')) {
    await prisma.$runCommandRaw({
      dropIndexes: 'Giftlist',
      index: 'Giftlist_categoryId_idx',
    })
  }
}
