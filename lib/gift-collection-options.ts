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
        giftlist.eventTypeIds.includes(eventTypeId) &&
        giftlist.eventTypeIds.every(requiredTypeId =>
          category.eventTypeIds.includes(requiredTypeId)
        )
    )
    .map(giftlist => giftlist.id)
}

export function retainCategoryCompatibleGiftlistIds(
  selectedIds: string[],
  giftlists: GiftlistOption[],
  category: Category | undefined
) {
  if (!category) return []

  return selectedIds.filter(id => {
    const giftlist = giftlists.find(item => item.id === id)
    return giftlist?.eventTypeIds.every(requiredTypeId =>
      category.eventTypeIds.includes(requiredTypeId)
    )
  })
}
