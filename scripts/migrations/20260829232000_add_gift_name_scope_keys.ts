import type { Prisma, PrismaClient } from '@prisma/client'
import { buildGiftNameScopeKey, normalizeGiftName } from '../../lib/gift-name'
import { mongoRawDocuments, mongoValueKey } from '../mongo-raw'

type RawGift = {
  _id: Prisma.InputJsonValue
  name?: string
  categoryId?: Prisma.InputJsonValue
  isDefault?: boolean
  eventId?: Prisma.InputJsonValue
  createdAt?: Prisma.InputJsonValue
}

type RawCategory = {
  _id: Prisma.InputJsonValue
  name?: string
}

export function buildGiftNameBackfill(
  gifts: RawGift[],
  categories: RawCategory[]
) {
  const categoryNames = new Map(
    categories.map(category => [
      mongoValueKey(category._id),
      normalizeGiftName(category.name ?? mongoValueKey(category._id)),
    ])
  )
  const sortedGifts = [...gifts].sort((left, right) => {
    const createdAtComparison = String(left.createdAt ?? '').localeCompare(
      String(right.createdAt ?? '')
    )
    return (
      createdAtComparison ||
      mongoValueKey(left._id).localeCompare(mongoValueKey(right._id))
    )
  })
  const usedKeys = new Set<string>()

  return sortedGifts.map(gift => {
    const originalName = String(gift.name ?? '').trim()
    const categoryId = gift.categoryId ? mongoValueKey(gift.categoryId) : ''
    const isDefault = gift.isDefault === true
    const eventId =
      isDefault || !gift.eventId ? undefined : mongoValueKey(gift.eventId)
    const categoryName = categoryNames.get(categoryId) ?? categoryId
    let name = originalName
    let nameScopeKey = buildGiftNameScopeKey({
      name,
      categoryId,
      isDefault,
      eventId,
    })
    let copyNumber = 2

    while (usedKeys.has(nameScopeKey)) {
      name = `${originalName}-copy-${categoryName}-${copyNumber}`
      nameScopeKey = buildGiftNameScopeKey({
        name,
        categoryId,
        isDefault,
        eventId,
      })
      copyNumber += 1
    }

    usedKeys.add(nameScopeKey)
    return {
      giftId: gift._id,
      name,
      nameScopeKey,
    }
  })
}

export async function up(prisma: PrismaClient) {
  const [rawGifts, rawCategories] = await Promise.all([
    prisma.gift.findRaw({
      filter: {},
      options: {
        projection: {
          _id: 1,
          name: 1,
          categoryId: 1,
          isDefault: 1,
          eventId: 1,
          createdAt: 1,
        },
      },
    }),
    prisma.category.findRaw({
      filter: {},
      options: {
        projection: { _id: 1, name: 1 },
      },
    }),
  ])
  const gifts = mongoRawDocuments<RawGift>(rawGifts)
  const categories = mongoRawDocuments<RawCategory>(rawCategories)
  const updates = buildGiftNameBackfill(gifts, categories)

  if (updates.length === 0) return

  await prisma.$runCommandRaw({
    update: 'Gift',
    updates: updates.map(({ giftId, name, nameScopeKey }) => ({
      q: { _id: giftId },
      u: {
        $set: { name, nameScopeKey },
      },
    })),
  })
}
