import type { Prisma, PrismaClient } from '@prisma/client'
import { mongoRawDocuments, mongoValueKey } from '../mongo-raw'

type RawGift = {
  _id: Prisma.InputJsonValue
  giftlistIds?: Prisma.InputJsonValue[]
}

type RawGiftlist = {
  _id: Prisma.InputJsonValue
}

export function buildGiftlistGiftIdRepair(
  gifts: RawGift[],
  giftlists: RawGiftlist[]
) {
  const validGiftlists = new Map(
    giftlists.map(giftlist => [mongoValueKey(giftlist._id), giftlist._id])
  )
  const giftIdsByGiftlist = new Map(
    giftlists.map(giftlist => [
      mongoValueKey(giftlist._id),
      [] as Prisma.InputJsonValue[],
    ])
  )

  const giftUpdates = gifts.map(gift => {
    const validIds = Array.from(
      new Map(
        (gift.giftlistIds ?? []).flatMap(giftlistId => {
          const validId = validGiftlists.get(mongoValueKey(giftlistId))
          return validId ? [[mongoValueKey(validId), validId] as const] : []
        })
      ).values()
    )

    for (const giftlistId of validIds) {
      giftIdsByGiftlist.get(mongoValueKey(giftlistId))?.push(gift._id)
    }

    return { giftId: gift._id, giftlistIds: validIds }
  })

  return {
    giftUpdates,
    giftlistUpdates: giftlists.map(giftlist => ({
      giftlistId: giftlist._id,
      giftIds: giftIdsByGiftlist.get(mongoValueKey(giftlist._id)) ?? [],
    })),
  }
}

export async function up(prisma: PrismaClient) {
  const [rawGifts, rawGiftlists] = await Promise.all([
    prisma.gift.findRaw({
      filter: {},
      options: { projection: { _id: 1, giftlistIds: 1 } },
    }),
    prisma.giftlist.findRaw({
      filter: {},
      options: { projection: { _id: 1 } },
    }),
  ])
  const { giftUpdates, giftlistUpdates } = buildGiftlistGiftIdRepair(
    mongoRawDocuments<RawGift>(rawGifts),
    mongoRawDocuments<RawGiftlist>(rawGiftlists)
  )

  if (giftUpdates.length > 0) {
    await prisma.$runCommandRaw({
      update: 'Gift',
      updates: giftUpdates.map(({ giftId, giftlistIds }) => ({
        q: { _id: giftId },
        u: { $set: { giftlistIds } },
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
