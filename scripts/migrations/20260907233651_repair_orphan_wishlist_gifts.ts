import type { Prisma, PrismaClient } from '@prisma/client'
import { mongoRawDocuments, mongoValueKey } from '../mongo-raw'

type RawWishlistGift = {
  _id: Prisma.InputJsonValue
  giftId?: Prisma.InputJsonValue
  eventId?: Prisma.InputJsonValue
}

type RawGift = {
  _id: Prisma.InputJsonValue
}

type RawTransaction = {
  wishlistGiftId?: Prisma.InputJsonValue
  status?: string
}

export function classifyOrphanWishlistGifts(
  wishlistGifts: RawWishlistGift[],
  gifts: RawGift[],
  transactions: RawTransaction[]
) {
  const giftIds = new Set(gifts.map(gift => mongoValueKey(gift._id)))
  const statusesByWishlistGift = new Map<string, string[]>()

  for (const transaction of transactions) {
    if (transaction.wishlistGiftId === undefined) continue
    const key = mongoValueKey(transaction.wishlistGiftId)
    const statuses = statusesByWishlistGift.get(key) ?? []
    statuses.push(transaction.status ?? 'OPEN')
    statusesByWishlistGift.set(key, statuses)
  }

  const orphans = wishlistGifts.filter(
    wishlistGift =>
      wishlistGift.giftId === undefined ||
      !giftIds.has(mongoValueKey(wishlistGift.giftId))
  )

  return {
    deletableIds: orphans
      .filter(
        orphan =>
          (statusesByWishlistGift.get(mongoValueKey(orphan._id)) ?? [])
            .length === 0
      )
      .map(orphan => orphan._id),
    archivable: orphans
      .filter(
        orphan =>
          (statusesByWishlistGift.get(mongoValueKey(orphan._id)) ?? []).length >
          0
      )
      .map(orphan => ({
        wishlistGiftId: orphan._id,
        eventId: orphan.eventId,
        statuses: statusesByWishlistGift.get(mongoValueKey(orphan._id)) ?? [],
      })),
  }
}

export async function up(prisma: PrismaClient) {
  const [rawWishlistGifts, rawGifts, rawTransactions] = await Promise.all([
    prisma.wishlistGift.findRaw({
      filter: {},
      options: { projection: { _id: 1, giftId: 1, eventId: 1 } },
    }),
    prisma.gift.findRaw({
      filter: {},
      options: { projection: { _id: 1 } },
    }),
    prisma.transaction.findRaw({
      filter: {},
      options: { projection: { wishlistGiftId: 1, status: 1 } },
    }),
  ])

  const { deletableIds, archivable } = classifyOrphanWishlistGifts(
    mongoRawDocuments<RawWishlistGift>(rawWishlistGifts),
    mongoRawDocuments<RawGift>(rawGifts),
    mongoRawDocuments<RawTransaction>(rawTransactions)
  )

  if (deletableIds.length > 0) {
    await prisma.$runCommandRaw({
      delete: 'WishlistGift',
      deletes: deletableIds.map(wishlistGiftId => ({
        q: { _id: wishlistGiftId },
        limit: 1,
      })),
    })
  }

  if (archivable.length > 0) {
    await prisma.$runCommandRaw({
      update: 'WishlistGift',
      updates: archivable.map(({ wishlistGiftId }) => ({
        q: { _id: wishlistGiftId },
        u: { $set: { isReceived: true } },
      })),
    })
  }

  console.info(
    `Orphan wishlist gifts: deleted ${deletableIds.length}, archived ${archivable.length}.`
  )

  for (const orphan of archivable) {
    console.info(
      `  archived ${mongoValueKey(orphan.wishlistGiftId)} (event ${orphan.eventId ? mongoValueKey(orphan.eventId) : 'unknown'
      }): ${orphan.statuses.join(', ')}`
    )
  }
}
