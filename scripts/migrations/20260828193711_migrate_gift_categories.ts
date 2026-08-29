import type { PrismaClient } from '@prisma/client'

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

export async function up(prisma: PrismaClient) {
  const [gifts, categories] = await Promise.all([
    prisma.gift.findMany({ select: { id: true, categoryId: true } }),
    prisma.category.findMany({ select: { id: true } }),
  ])
  const categoryIds = new Set(categories.map(category => category.id))
  const orphanGifts = gifts.filter(gift => !categoryIds.has(gift.categoryId))

  if (orphanGifts.length === 0) return

  const orphanGiftIds = orphanGifts.map(gift => gift.id)
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
    await prisma.$transaction(async tx => {
      await tx.image.deleteMany({
        where: { giftId: { in: deletableGiftIds } },
      })
      await tx.gift.deleteMany({ where: { id: { in: deletableGiftIds } } })
    })
  }

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
