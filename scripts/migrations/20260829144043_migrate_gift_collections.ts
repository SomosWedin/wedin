import type { Prisma, PrismaClient } from '@prisma/client'

type RawGift = {
  _id: Prisma.InputJsonValue
  giftlistId?: Prisma.InputJsonValue
  giftlistIds?: Prisma.InputJsonValue[]
}

type RawGiftlist = {
  _id: Prisma.InputJsonValue
  giftIds?: Prisma.InputJsonValue[]
}

function firstBatch<T>(result: Prisma.JsonObject) {
  return (result as unknown as { cursor: { firstBatch: T[] } }).cursor
    .firstBatch
}

export function buildGiftCollectionBackfill(
  gifts: RawGift[],
  giftlists: RawGiftlist[]
) {
  const validGifts = new Map(gifts.map(gift => [String(gift._id), gift._id]))
  const validGiftlists = new Map(
    giftlists.map(giftlist => [String(giftlist._id), giftlist._id])
  )
  const giftlistsByGift = new Map(
    gifts.map(gift => [
      String(gift._id),
      new Map<string, Prisma.InputJsonValue>(),
    ])
  )

  for (const gift of gifts) {
    const links = giftlistsByGift.get(String(gift._id))
    for (const requestedId of [...(gift.giftlistIds ?? []), gift.giftlistId]) {
      if (!requestedId) continue
      const giftlistId = validGiftlists.get(String(requestedId))
      if (giftlistId) links?.set(String(giftlistId), giftlistId)
    }
  }

  for (const giftlist of giftlists) {
    for (const requestedId of giftlist.giftIds ?? []) {
      const giftId = validGifts.get(String(requestedId))
      if (!giftId) continue
      giftlistsByGift
        .get(String(giftId))
        ?.set(String(giftlist._id), giftlist._id)
    }
  }

  const giftUpdates = gifts.map(gift => ({
    giftId: gift._id,
    giftlistIds: Array.from(
      giftlistsByGift.get(String(gift._id))?.values() ?? []
    ),
  }))
  const giftsByGiftlist = new Map(
    giftlists.map(giftlist => [
      String(giftlist._id),
      [] as Prisma.InputJsonValue[],
    ])
  )
  for (const gift of giftUpdates) {
    for (const giftlistId of gift.giftlistIds) {
      giftsByGiftlist.get(String(giftlistId))?.push(gift.giftId)
    }
  }

  return {
    giftUpdates,
    giftlistUpdates: giftlists.map(giftlist => ({
      giftlistId: giftlist._id,
      giftIds: giftsByGiftlist.get(String(giftlist._id)) ?? [],
    })),
  }
}

export async function up(prisma: PrismaClient) {
  const [rawGifts, rawGiftlists] = await Promise.all([
    prisma.$runCommandRaw({
      find: 'Gift',
      filter: {},
      projection: { _id: 1, giftlistId: 1, giftlistIds: 1 },
    }),
    prisma.$runCommandRaw({
      find: 'Giftlist',
      filter: {},
      projection: { _id: 1, giftIds: 1 },
    }),
  ])

  const { giftUpdates, giftlistUpdates } = buildGiftCollectionBackfill(
    firstBatch<RawGift>(rawGifts),
    firstBatch<RawGiftlist>(rawGiftlists)
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
}
