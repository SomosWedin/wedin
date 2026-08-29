const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

type RawGift = {
  _id: unknown
  giftlistId?: unknown
  giftlistIds?: unknown[]
}

type RawGiftlist = { _id: unknown }

export function buildGiftCollectionBackfill(
  gifts: RawGift[],
  giftlists: RawGiftlist[]
) {
  const validIds = new Map(
    giftlists.map(giftlist => [String(giftlist._id), giftlist._id])
  )
  const giftsByGiftlist = new Map(
    giftlists.map(giftlist => [String(giftlist._id), [] as unknown[]])
  )

  const giftUpdates = gifts.map(gift => {
    const requestedIds = [...(gift.giftlistIds ?? []), gift.giftlistId].filter(
      (id): id is unknown => Boolean(id)
    )
    const giftlistIds = Array.from(new Set(requestedIds.map(id => String(id))))
      .map(id => validIds.get(id))
      .filter((id): id is unknown => Boolean(id))

    for (const giftlistId of giftlistIds) {
      giftsByGiftlist.get(String(giftlistId))?.push(gift._id)
    }

    return { giftId: gift._id, giftlistIds }
  })

  return {
    giftUpdates,
    giftlistUpdates: giftlists.map(giftlist => ({
      giftlistId: giftlist._id,
      giftIds: giftsByGiftlist.get(String(giftlist._id)) ?? [],
    })),
  }
}

async function main() {
  const [rawGifts, rawGiftlists] = await Promise.all([
    prisma.$runCommandRaw({
      find: 'Gift',
      filter: {},
      projection: { _id: 1, giftlistId: 1, giftlistIds: 1 },
    }),
    prisma.$runCommandRaw({
      find: 'Giftlist',
      filter: {},
      projection: { _id: 1 },
    }),
  ])

  const { giftUpdates, giftlistUpdates } = buildGiftCollectionBackfill(
    rawGifts.cursor.firstBatch,
    rawGiftlists.cursor.firstBatch
  )

  if (giftUpdates.length > 0) {
    await prisma.$runCommandRaw({
      update: 'Gift',
      updates: giftUpdates.map(({ giftId, giftlistIds }) => ({
        q: { _id: giftId },
        u: { $set: { giftlistIds }, $unset: { giftlistId: '' } },
      })),
    })
  }

  if (giftlistUpdates.length > 0) {
    await prisma.$runCommandRaw({
      update: 'Giftlist',
      updates: giftlistUpdates.map(({ giftlistId, giftIds }) => ({
        q: { _id: giftlistId },
        u: { $set: { giftIds } },
      })),
    })
  }

  console.log(
    `Migrated ${giftUpdates.length} gifts and ${giftlistUpdates.length} collections to many-to-many relationships.`
  )
}

if (require.main === module) {
  main()
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => prisma.$disconnect())
}
