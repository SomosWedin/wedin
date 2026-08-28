const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

type GiftCategoryReference = { id: string; categoryId: string }
type WishlistGiftReference = { id: string; giftId: string }

export function classifyOrphanGifts(
  gifts: GiftCategoryReference[],
  categoryIds: Set<string>,
  wishlistLinks: WishlistGiftReference[]
) {
  const orphanGifts = gifts.filter(gift => !categoryIds.has(gift.categoryId))
  const referencedGiftIds = new Set(wishlistLinks.map(link => link.giftId))

  return {
    orphanGifts,
    deletableGiftIds: orphanGifts
      .filter(gift => !referencedGiftIds.has(gift.id))
      .map(gift => gift.id),
    referencedOrphans: orphanGifts
      .filter(gift => referencedGiftIds.has(gift.id))
      .map(gift => ({
        giftId: gift.id,
        categoryId: gift.categoryId,
        wishlistGiftIds: wishlistLinks
          .filter(link => link.giftId === gift.id)
          .map(link => link.id),
      })),
  }
}

async function main() {
  const [gifts, categories] = await Promise.all([
    prisma.gift.findMany({ select: { id: true, categoryId: true } }),
    prisma.category.findMany({ select: { id: true } }),
  ])
  const categoryIds = new Set<string>(
    categories.map((category: { id: string }) => category.id)
  )
  const orphanGifts = gifts.filter(
    (gift: GiftCategoryReference) => !categoryIds.has(gift.categoryId)
  )

  if (orphanGifts.length === 0) {
    console.log('Gift categories validated. No orphan gifts found.')
    return
  }

  const orphanGiftIds = orphanGifts.map((gift: { id: string }) => gift.id)
  const wishlistLinks = await prisma.wishlistGift.findMany({
    where: { giftId: { in: orphanGiftIds } },
    select: { id: true, giftId: true },
  })
  const { deletableGiftIds, referencedOrphans } = classifyOrphanGifts(
    orphanGifts,
    categoryIds,
    wishlistLinks
  )

  if (deletableGiftIds.length > 0) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.image.deleteMany({
        where: { giftId: { in: deletableGiftIds } },
      })
      await tx.gift.deleteMany({ where: { id: { in: deletableGiftIds } } })
    })
  }

  console.log(`Deleted ${deletableGiftIds.length} unreferenced orphan gifts.`)

  if (referencedOrphans.length > 0) {
    console.error(
      'Referenced orphan gifts were retained. Assign each one a valid category before continuing:'
    )
    console.error(JSON.stringify(referencedOrphans, null, 2))
    throw new Error(
      `${referencedOrphans.length} referenced orphan gift(s) require repair.`
    )
  }
}

if (require.main === module) {
  main()
    .catch((error: unknown) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
