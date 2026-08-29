import type { Category } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  getGiftlistOptionIds,
  retainCategoryCompatibleGiftlistIds,
} from '@/lib/gift-collection-options'

const category = {
  id: 'category-home',
  name: 'Hogar',
  eventTypeIds: ['wedding', 'birthday'],
} as Category

const giftlists = [
  { id: 'wedding-list', name: 'Boda', eventTypeIds: ['wedding'] },
  { id: 'birthday-list', name: 'Cumpleaños', eventTypeIds: ['birthday'] },
  {
    id: 'baby-list',
    name: 'Baby Shower',
    eventTypeIds: ['baby-shower'],
  },
]

describe('admin gift collection options', () => {
  it('filters dropdown options without removing compatible selections from other event types', () => {
    expect(getGiftlistOptionIds(giftlists, category, 'birthday')).toEqual([
      'birthday-list',
    ])
    expect(
      retainCategoryCompatibleGiftlistIds(
        ['wedding-list', 'birthday-list'],
        giftlists,
        category
      )
    ).toEqual(['wedding-list', 'birthday-list'])
  })

  it('removes selected collections that a new category cannot support', () => {
    const weddingOnlyCategory = {
      ...category,
      id: 'category-wedding',
      eventTypeIds: ['wedding'],
    }

    expect(
      retainCategoryCompatibleGiftlistIds(
        ['wedding-list', 'birthday-list'],
        giftlists,
        weddingOnlyCategory
      )
    ).toEqual(['wedding-list'])
  })
})
