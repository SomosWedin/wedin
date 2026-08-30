import type { Category } from '@prisma/client'
import type { GiftlistOption } from '@/actions/data/giftlist'

export function getGiftlistOptionIds(
  giftlists: GiftlistOption[],
  category: Category | undefined,
  eventTypeId: string
) {
  if (!category || !eventTypeId) return []

  return giftlists
    .filter(
      giftlist =>
        giftlist.eventTypeIds.length === 0 ||
        giftlist.eventTypeIds.includes(eventTypeId)
    )
    .map(giftlist => giftlist.id)
}

export function retainCategoryCompatibleGiftlistIds(
  selectedIds: string[],
  giftlists: GiftlistOption[],
  category: Category | undefined
) {
  if (!category) return []

  const existingIds = new Set(giftlists.map(giftlist => giftlist.id))
  return selectedIds.filter(id => existingIds.has(id))
}
