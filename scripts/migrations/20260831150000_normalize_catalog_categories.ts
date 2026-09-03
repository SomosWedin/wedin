import type { Prisma, PrismaClient } from '@prisma/client'
import { normalizeCategoryName } from '../../lib/category-name'
import { intersectEventTypeIds } from '../../lib/event-type-compatibility'
import { buildGiftNameScopeKey, normalizeGiftName } from '../../lib/gift-name'
import { mongoRawDocuments, mongoValueKey } from '../mongo-raw'

type RawCategoryState = {
  _id: Prisma.InputJsonValue
  isCatalog?: boolean
}

type RepairGift = {
  id: string
  name: string
  price: string
  categoryId: string
  isDefault: boolean
  eventId: string | null
  createdAt: Date
  image: { url: string | null } | null
  wishlistGifts: { id: string; eventId: string }[]
}

type RepairCategory = {
  id: string
  name: string
  eventTypeIds: string[]
  gifts: RepairGift[]
}

type RepairCollectionGift = {
  id: string
  category: { eventTypeIds: string[] }
}

type PrivateGiftMergeCandidate = {
  id: string
  name: string
  eventId: string | null
}

type RawIndex = {
  name?: string
  key?: Prisma.JsonObject
}

type RawGiftSetUpdate = {
  giftId: string
  values: Prisma.InputJsonObject
}

export function selectLargestCompatibleGiftSet(gifts: RepairCollectionGift[]) {
  if (gifts.length === 0) {
    return { eventTypeId: null, keptGiftIds: [], removedGiftIds: [] }
  }

  const sharedEventTypeIds = intersectEventTypeIds(
    gifts.map(gift => gift.category.eventTypeIds)
  )
  if (sharedEventTypeIds.length > 0) {
    return {
      eventTypeId: [...sharedEventTypeIds].sort()[0],
      keptGiftIds: gifts.map(gift => gift.id),
      removedGiftIds: [],
    }
  }

  const coverage = new Map<string, number>()
  for (const gift of gifts) {
    for (const eventTypeId of Array.from(new Set(gift.category.eventTypeIds))) {
      coverage.set(eventTypeId, (coverage.get(eventTypeId) ?? 0) + 1)
    }
  }
  const eventTypeId = Array.from(coverage.entries()).sort(
    ([leftId, leftCount], [rightId, rightCount]) =>
      rightCount - leftCount || leftId.localeCompare(rightId)
  )[0]?.[0]
  const keptGiftIds = eventTypeId
    ? gifts
      .filter(gift => gift.category.eventTypeIds.includes(eventTypeId))
      .map(gift => gift.id)
    : []
  const keptIds = new Set(keptGiftIds)

  return {
    eventTypeId: eventTypeId ?? null,
    keptGiftIds,
    removedGiftIds: gifts
      .filter(gift => !keptIds.has(gift.id))
      .map(gift => gift.id),
  }
}

function sortedIds(values: string[]) {
  return Array.from(new Set(values)).sort()
}

export function buildRawGiftSetUpdates(updates: RawGiftSetUpdate[]) {
  return updates.map(update => ({
    q: { _id: { $oid: update.giftId } },
    u: { $set: update.values },
  }))
}

async function updateGiftsInBulk(
  tx: Prisma.TransactionClient,
  updates: RawGiftSetUpdate[]
) {
  if (updates.length === 0) return

  await tx.$runCommandRaw({
    update: 'Gift',
    updates: buildRawGiftSetUpdates(updates),
  })
}

export function buildMergedGiftNamePlan(
  gifts: Pick<RepairGift, 'id' | 'name' | 'createdAt'>[],
  canonicalCategoryId: string,
  normalizedCategoryName: string
) {
  const usedGiftKeys = new Set<string>()

  return [...gifts]
    .sort(
      (left, right) =>
        left.createdAt.getTime() - right.createdAt.getTime() ||
        left.id.localeCompare(right.id)
    )
    .map(gift => {
      let name = gift.name.trim()
      let nameScopeKey = buildGiftNameScopeKey({
        name,
        categoryId: canonicalCategoryId,
        isDefault: true,
      })
      let copyNumber = 2

      while (usedGiftKeys.has(nameScopeKey)) {
        name = `${gift.name.trim()}-copy-${normalizedCategoryName}-${copyNumber}`
        nameScopeKey = buildGiftNameScopeKey({
          name,
          categoryId: canonicalCategoryId,
          isDefault: true,
        })
        copyNumber += 1
      }
      usedGiftKeys.add(nameScopeKey)

      return { giftId: gift.id, name, nameScopeKey }
    })
}

export function buildPrivateGiftMergePlan(
  gifts: PrivateGiftMergeCandidate[],
  canonicalCategoryId: string
) {
  const giftIdByScopeKey = new Map<string, string>()

  return gifts.map(gift => {
    const nameScopeKey = buildGiftNameScopeKey({
      name: gift.name,
      categoryId: canonicalCategoryId,
      isDefault: false,
      eventId: gift.eventId ?? undefined,
    })
    const conflictingGiftId = giftIdByScopeKey.get(nameScopeKey)
    if (conflictingGiftId) {
      throw new Error(
        `No se pueden consolidar las categorías: los regalos privados ${conflictingGiftId} y ${gift.id} tienen el mismo nombre en el mismo evento.`
      )
    }
    giftIdByScopeKey.set(nameScopeKey, gift.id)
    return { giftId: gift.id, nameScopeKey }
  })
}

async function copyWishlistLinks(
  tx: Prisma.TransactionClient,
  gift: RepairGift,
  categoryId: string
) {
  for (const wishlistGift of gift.wishlistGifts) {
    const privateGift = await tx.gift.create({
      data: {
        name: gift.name,
        nameScopeKey: buildGiftNameScopeKey({
          name: gift.name,
          categoryId,
          isDefault: false,
          eventId: wishlistGift.eventId,
        }),
        price: gift.price,
        category: { connect: { id: categoryId } },
        event: { connect: { id: wishlistGift.eventId } },
        giftlists: { connect: [] },
        isDefault: false,
        ...(gift.image?.url
          ? { image: { create: { url: gift.image.url } } }
          : {}),
      },
    })
    await tx.wishlistGift.update({
      where: { id: wishlistGift.id },
      data: { giftId: privateGift.id },
    })
  }
}

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

async function removeLegacyCategoryFieldsAndIndexes(prisma: PrismaClient) {
  let indexes: RawIndex[] = []
  try {
    indexes = firstBatch<RawIndex>(
      await prisma.$runCommandRaw({ listIndexes: 'Category' })
    )
  } catch (error) {
    if (!isMissingNamespace(error)) throw error
  }

  const obsoleteIndexes = indexes.filter(
    index =>
      index.name &&
      (index.key?.nameScopeKey === 1 ||
        index.name === 'Category_catalog_normalizedName_key')
  )
  for (const index of obsoleteIndexes) {
    await prisma.$runCommandRaw({
      dropIndexes: 'Category',
      index: index.name as string,
    })
  }

  await prisma.$runCommandRaw({
    update: 'Category',
    updates: [
      {
        q: {
          $or: [
            { isCatalog: { $exists: true } },
            { nameScopeKey: { $exists: true } },
          ],
        },
        u: { $unset: { isCatalog: '', nameScopeKey: '' } },
        multi: true,
      },
    ],
  })
}

export async function up(prisma: PrismaClient) {
  const rawStates = mongoRawDocuments<RawCategoryState>(
    await prisma.category.findRaw({
      filter: {},
      options: { projection: { _id: 1, isCatalog: 1 } },
    })
  )
  const stateById = new Map(
    rawStates.map(category => [mongoValueKey(category._id), category])
  )
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      eventTypeIds: true,
      gifts: {
        select: {
          id: true,
          name: true,
          price: true,
          categoryId: true,
          isDefault: true,
          eventId: true,
          createdAt: true,
          image: { select: { url: true } },
          wishlistGifts: { select: { id: true, eventId: true } },
        },
      },
    },
  })
  const groups = new Map<string, RepairCategory[]>()
  for (const category of categories) {
    const key = normalizeCategoryName(category.name)
    groups.set(key, [...(groups.get(key) ?? []), category])
  }

  for (const [normalizedName, group] of Array.from(groups.entries())) {
    const repairSummary = await prisma.$transaction(
      async tx => {
        const ordered = [...group].sort((left, right) => {
          const catalogOrder =
            Number(stateById.get(right.id)?.isCatalog === true) -
            Number(stateById.get(left.id)?.isCatalog === true)
          return catalogOrder || left.id.localeCompare(right.id)
        })
        const canonical = ordered[0]
        const allGifts = ordered.flatMap(category => category.gifts)
        const defaultGifts = allGifts.filter(gift => gift.isDefault)
        const privateGifts = allGifts.filter(gift => !gift.isDefault)
        const canonicalEventTypeIds = sortedIds(
          ordered.flatMap(category => category.eventTypeIds)
        )
        const defaultPlans = buildMergedGiftNamePlan(
          defaultGifts,
          canonical.id,
          normalizedName
        )
        const defaultPlanById = new Map(
          defaultPlans.map(plan => [plan.giftId, plan])
        )
        const renamedDefaultGifts = defaultGifts.filter(gift => {
          const plan = defaultPlanById.get(gift.id)
          return (
            plan &&
            normalizeGiftName(plan.name) !== normalizeGiftName(gift.name)
          )
        })
        const privateCandidates: PrivateGiftMergeCandidate[] = [
          ...privateGifts.map(gift => ({
            id: gift.id,
            name: gift.name,
            eventId: gift.eventId,
          })),
          ...renamedDefaultGifts.flatMap(gift =>
            gift.wishlistGifts.map(wishlistGift => ({
              id: `wishlist-copy:${gift.id}:${wishlistGift.id}`,
              name: gift.name,
              eventId: wishlistGift.eventId,
            }))
          ),
        ]
        const privatePlanById = new Map(
          buildPrivateGiftMergePlan(privateCandidates, canonical.id).map(
            plan => [plan.giftId, plan]
          )
        )

        await updateGiftsInBulk(
          tx,
          allGifts.map(gift => ({
            giftId: gift.id,
            values: {
              nameScopeKey: `migration-category-merge:${gift.id}`,
            },
          }))
        )

        const privateUpdates = privateGifts.map(gift => {
          const plan = privatePlanById.get(gift.id)
          if (!plan) throw new Error(`Missing private gift plan: ${gift.id}`)
          return {
            giftId: gift.id,
            values: {
              nameScopeKey: plan.nameScopeKey,
              categoryId: { $oid: canonical.id },
            },
          }
        })

        const defaultUpdates: RawGiftSetUpdate[] = []
        for (const gift of defaultGifts) {
          const plan = defaultPlanById.get(gift.id)
          if (!plan) throw new Error(`Missing catalog gift plan: ${gift.id}`)
          const nameChanged =
            normalizeGiftName(plan.name) !== normalizeGiftName(gift.name)
          if (nameChanged && gift.wishlistGifts.length > 0) {
            await copyWishlistLinks(tx, gift, canonical.id)
          }
          defaultUpdates.push({
            giftId: gift.id,
            values: {
              name: plan.name,
              nameScopeKey: plan.nameScopeKey,
              categoryId: { $oid: canonical.id },
            },
          })
        }

        await updateGiftsInBulk(tx, privateUpdates)
        await updateGiftsInBulk(tx, defaultUpdates)

        await tx.category.update({
          where: { id: canonical.id },
          data: {
            name: canonical.name.trim(),
            normalizedName,
            eventTypes: {
              set: canonicalEventTypeIds.map(id => ({ id })),
            },
          },
        })

        const mergedCategoryIds = ordered
          .filter(category => category.id !== canonical.id)
          .map(category => category.id)
        for (const categoryId of mergedCategoryIds) {
          await tx.category.update({
            where: { id: categoryId },
            data: { eventTypes: { set: [] } },
          })
          await tx.category.delete({ where: { id: categoryId } })
        }

        return {
          canonicalCategoryId: canonical.id,
          mergedCategoryIds,
          renamedGifts: defaultPlans
            .filter(plan => {
              const gift = defaultGifts.find(
                candidate => candidate.id === plan.giftId
              )
              return (
                gift &&
                normalizeGiftName(plan.name) !== normalizeGiftName(gift.name)
              )
            })
            .map(plan => {
              const gift = defaultGifts.find(
                candidate => candidate.id === plan.giftId
              ) as RepairGift
              return {
                giftId: gift.id,
                previousName: gift.name,
                name: plan.name,
              }
            }),
        }
      },
      { timeout: 60_000 }
    )

    if (repairSummary.mergedCategoryIds.length > 0) {
      console.log(
        `Merged categories ${repairSummary.mergedCategoryIds.join(', ')} into ${repairSummary.canonicalCategoryId}.`
      )
    }
    for (const renamedGift of repairSummary.renamedGifts) {
      console.log(
        `Renamed gift ${renamedGift.giftId}: ${renamedGift.previousName} -> ${renamedGift.name}.`
      )
    }
  }

  const giftlists = await prisma.giftlist.findMany({
    select: {
      id: true,
      name: true,
      gifts: {
        select: {
          id: true,
          category: { select: { eventTypeIds: true } },
        },
      },
    },
  })

  for (const giftlist of giftlists) {
    const repair = selectLargestCompatibleGiftSet(giftlist.gifts)
    if (repair.removedGiftIds.length === 0) continue

    await prisma.giftlist.update({
      where: { id: giftlist.id },
      data: {
        gifts: { set: repair.keptGiftIds.map(id => ({ id })) },
      },
    })
    console.log(
      `Repaired collection ${giftlist.name}: removed ${repair.removedGiftIds.join(', ')}`
    )
  }

  await removeLegacyCategoryFieldsAndIndexes(prisma)
}
