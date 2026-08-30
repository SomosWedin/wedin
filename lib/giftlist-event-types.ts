type GiftCategoryEventTypes = {
  category: { eventTypeIds: string[] }
}

export function deriveGiftlistEventTypeIds(
  gifts: GiftCategoryEventTypes[]
): string[] {
  if (gifts.length === 0) return []

  return gifts
    .slice(1)
    .reduce(
      (commonIds, gift) =>
        commonIds.filter(eventTypeId =>
          gift.category.eventTypeIds.includes(eventTypeId)
        ),
      [...gifts[0].category.eventTypeIds]
    )
}
