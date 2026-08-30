type GiftCategoryEventTypes = {
  category: { eventTypeIds: string[] }
}

export function deriveGiftlistEventTypeIds(
  gifts: GiftCategoryEventTypes[]
): string[] {
  return Array.from(new Set(gifts.flatMap(gift => gift.category.eventTypeIds)))
}
