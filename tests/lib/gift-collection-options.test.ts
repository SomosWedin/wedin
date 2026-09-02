import type { Category } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  getGiftlistOptionIds,
  getIncompatibleGiftlistsForCategoryChange,
  retainCategoryCompatibleGiftlistIds,
} from '@/lib/gift-collection-options'

const category = {
  id: 'category-home',
  name: 'Hogar',
  eventTypeIds: ['wedding', 'birthday'],
} as Category

const giftlists = [
  { id: 'empty-list', name: 'Vacía', eventTypeIds: [], gifts: [] },
  {
    id: 'wedding-list',
    name: 'Boda',
    eventTypeIds: ['wedding'],
    gifts: [{ id: 'gift-wedding', eventTypeIds: ['wedding'] }],
  },
  {
    id: 'birthday-list',
    name: 'Cumpleaños',
    eventTypeIds: ['birthday'],
    gifts: [{ id: 'gift-birthday', eventTypeIds: ['birthday'] }],
  },
  {
    id: 'baby-list',
    name: 'Baby Shower',
    eventTypeIds: ['baby-shower'],
    gifts: [{ id: 'gift-baby', eventTypeIds: ['baby-shower'] }],
  },
]

describe('admin gift collection options', () => {
  it('filters dropdown options without removing compatible selections from other event types', () => {
    expect(getGiftlistOptionIds(giftlists, category)).toEqual([
      'empty-list',
      'wedding-list',
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

  it('removes selections that share no event type with the category', () => {
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

  it('reports the exact collection mismatch without counting the edited gift', () => {
    const collections = [
      {
        id: 'mixed-list',
        name: 'Mixta',
        eventTypeIds: ['wedding'],
        gifts: [
          { id: 'edited-gift', eventTypeIds: ['wedding'] },
          {
            id: 'other-gift',
            eventTypeIds: ['wedding', 'birthday'],
          },
        ],
      },
      {
        id: 'only-gift-list',
        name: 'Solo este regalo',
        eventTypeIds: ['wedding'],
        gifts: [{ id: 'edited-gift', eventTypeIds: ['wedding'] }],
      },
    ]
    const babyCategory = {
      ...category,
      id: 'category-baby',
      eventTypeIds: ['baby-shower'],
    }

    expect(
      getIncompatibleGiftlistsForCategoryChange(
        collections,
        ['mixed-list', 'only-gift-list'],
        'edited-gift',
        babyCategory
      )
    ).toEqual([
      expect.objectContaining({
        id: 'mixed-list',
        remainingEventTypeIds: ['wedding', 'birthday'],
      }),
    ])
  })

  it('keeps a collection when the new category matches the remaining gifts', () => {
    const collection = {
      id: 'mixed-list',
      name: 'Mixta',
      eventTypeIds: ['wedding'],
      gifts: [
        { id: 'edited-gift', eventTypeIds: ['wedding'] },
        {
          id: 'other-gift',
          eventTypeIds: ['wedding', 'birthday'],
        },
      ],
    }
    const birthdayCategory = {
      ...category,
      id: 'category-birthday',
      eventTypeIds: ['birthday'],
    }

    expect(
      getIncompatibleGiftlistsForCategoryChange(
        [collection],
        ['mixed-list'],
        'edited-gift',
        birthdayCategory
      )
    ).toEqual([])
  })
})
