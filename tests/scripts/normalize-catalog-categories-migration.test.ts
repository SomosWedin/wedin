import { describe, expect, it } from 'vitest'
import {
  buildRawGiftSetUpdates,
  buildMergedGiftNamePlan,
  buildPrivateGiftMergePlan,
  selectLargestCompatibleGiftSet,
} from '@/scripts/migrations/20260831150000_normalize_catalog_categories'

const gift = (id: string, eventTypeIds: string[]) => ({
  id,
  category: { eventTypeIds },
})

describe('catalog category and collection repair migration', () => {
  it('builds one Mongo bulk update command entry per gift', () => {
    expect(
      buildRawGiftSetUpdates([
        {
          giftId: '507f1f77bcf86cd799439011',
          values: {
            nameScopeKey: 'migration-category-merge:gift-1',
            categoryId: { $oid: '507f1f77bcf86cd799439012' },
          },
        },
      ])
    ).toEqual([
      {
        q: { _id: { $oid: '507f1f77bcf86cd799439011' } },
        u: {
          $set: {
            nameScopeKey: 'migration-category-merge:gift-1',
            categoryId: { $oid: '507f1f77bcf86cd799439012' },
          },
        },
      },
    ])
  })

  it('keeps an already compatible collection unchanged', () => {
    expect(
      selectLargestCompatibleGiftSet([
        gift('gift-1', ['wedding', 'baby']),
        gift('gift-2', ['baby']),
      ])
    ).toEqual({
      eventTypeId: 'baby',
      keptGiftIds: ['gift-1', 'gift-2'],
      removedGiftIds: [],
    })
  })

  it('keeps the largest compatible set and deterministically breaks ties', () => {
    expect(
      selectLargestCompatibleGiftSet([
        gift('gift-1', ['wedding']),
        gift('gift-2', ['baby']),
        gift('gift-3', ['baby']),
        gift('gift-4', ['wedding']),
        gift('gift-5', []),
      ])
    ).toEqual({
      eventTypeId: 'baby',
      keptGiftIds: ['gift-2', 'gift-3'],
      removedGiftIds: ['gift-1', 'gift-4', 'gift-5'],
    })
  })

  it('keeps an empty collection empty', () => {
    expect(selectLargestCompatibleGiftSet([])).toEqual({
      eventTypeId: null,
      keptGiftIds: [],
      removedGiftIds: [],
    })
  })

  it('keeps the oldest gift name and deterministically renames later collisions', () => {
    const plan = buildMergedGiftNamePlan(
      [
        { id: 'gift-later', name: 'Vaso', createdAt: new Date('2026-02-01') },
        { id: 'gift-first', name: ' vaso ', createdAt: new Date('2026-01-01') },
      ],
      'category-drinks',
      'bebidas'
    )

    expect(
      plan.map(item => ({ giftId: item.giftId, name: item.name }))
    ).toEqual([
      { giftId: 'gift-first', name: 'vaso' },
      { giftId: 'gift-later', name: 'Vaso-copy-bebidas-2' },
    ])
  })

  it('moves private gifts to the shared category without changing their names', () => {
    const plan = buildPrivateGiftMergePlan(
      [
        { id: 'private-1', name: 'Vaso', eventId: 'event-1' },
        { id: 'private-2', name: 'Vaso', eventId: 'event-2' },
      ],
      'category-drinks'
    )

    expect(plan.map(item => item.giftId)).toEqual(['private-1', 'private-2'])
    expect(plan[0].nameScopeKey).toContain('category-drinks')
  })

  it('blocks a merge that would rename a private gift', () => {
    expect(() =>
      buildPrivateGiftMergePlan(
        [
          { id: 'private-1', name: 'Vaso', eventId: 'event-1' },
          { id: 'private-2', name: ' vaso ', eventId: 'event-1' },
        ],
        'category-drinks'
      )
    ).toThrow(/private-1.*private-2/)
  })
})
