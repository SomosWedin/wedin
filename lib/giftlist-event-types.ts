import { intersectEventTypeIds } from '@/lib/event-type-compatibility'

type GiftCategoryEventTypes = {
  category: { eventTypeIds: string[] }
}

export function deriveGiftlistEventTypeIds(
  gifts: GiftCategoryEventTypes[]
): string[] {
  return intersectEventTypeIds(gifts.map(gift => gift.category.eventTypeIds))
}
