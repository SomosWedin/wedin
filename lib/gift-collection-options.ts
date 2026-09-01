import type { Category } from '@prisma/client'
import type { GiftlistOption } from '@/actions/data/giftlist'
import {
  eventTypeIdsOverlap,
  intersectEventTypeIds,
} from '@/lib/event-type-compatibility'

export function getGiftlistOptionIds(
  giftlists: GiftlistOption[],
  category: Category | undefined
) {
  if (!category) return []

  return giftlists
    .filter(
      giftlist =>
        giftlist.gifts.length === 0 ||
        eventTypeIdsOverlap(giftlist.eventTypeIds, category.eventTypeIds)
    )
    .map(giftlist => giftlist.id)
}

export function retainCategoryCompatibleGiftlistIds(
  selectedIds: string[],
  giftlists: GiftlistOption[],
  category: Category | undefined
) {
  if (!category) return []

  const compatibleIds = new Set(getGiftlistOptionIds(giftlists, category))
  return selectedIds.filter(id => compatibleIds.has(id))
}

export function getIncompatibleGiftlistsForCategoryChange(
  giftlists: GiftlistOption[],
  selectedIds: string[],
  giftId: string,
  nextCategory: Category | undefined
) {
  if (!nextCategory) return []

  const selectedIdSet = new Set(selectedIds)

  return giftlists.flatMap(giftlist => {
    if (!selectedIdSet.has(giftlist.id)) return []

    const remainingGifts = giftlist.gifts.filter(gift => gift.id !== giftId)
    if (remainingGifts.length === 0) return []

    const remainingEventTypeIds = intersectEventTypeIds(
      remainingGifts.map(gift => gift.eventTypeIds)
    )

    return eventTypeIdsOverlap(remainingEventTypeIds, nextCategory.eventTypeIds)
      ? []
      : [{ ...giftlist, remainingEventTypeIds }]
  })
}
