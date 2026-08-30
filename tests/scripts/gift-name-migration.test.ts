import { describe, expect, it } from 'vitest'
import { buildGiftNameBackfill } from '../../scripts/migrations/20260829232000_add_gift_name_scope_keys'

describe('gift name scope migration', () => {
  it('allows the same name in different categories and renames same-scope duplicates', () => {
    const updates = buildGiftNameBackfill(
      [
        {
          _id: 'gift-1',
          name: 'Gato',
          categoryId: 'pets',
          isDefault: true,
          createdAt: '2026-01-01',
        },
        {
          _id: 'gift-2',
          name: ' gato ',
          categoryId: 'pets',
          isDefault: true,
          createdAt: '2026-01-02',
        },
        {
          _id: 'gift-3',
          name: 'Gato',
          categoryId: 'tools',
          isDefault: true,
          createdAt: '2026-01-03',
        },
      ],
      [
        { _id: 'pets', name: 'Mascotas' },
        { _id: 'tools', name: 'Herramientas' },
      ]
    )

    expect(updates).toEqual([
      expect.objectContaining({
        giftId: 'gift-1',
        name: 'Gato',
      }),
      expect.objectContaining({
        giftId: 'gift-2',
        name: 'gato-copy-mascotas-2',
      }),
      expect.objectContaining({
        giftId: 'gift-3',
        name: 'Gato',
      }),
    ])
    expect(new Set(updates.map(update => update.nameScopeKey)).size).toBe(3)
  })

  it('keeps catalog and organizer scopes independent', () => {
    const updates = buildGiftNameBackfill(
      [
        {
          _id: 'catalog-gift',
          name: 'Vaso',
          categoryId: 'category-1',
          isDefault: true,
        },
        {
          _id: 'private-gift-1',
          name: 'Vaso',
          categoryId: 'category-1',
          isDefault: false,
          eventId: 'event-1',
        },
        {
          _id: 'private-gift-2',
          name: 'Vaso',
          categoryId: 'category-1',
          isDefault: false,
          eventId: 'event-2',
        },
      ],
      [{ _id: 'category-1', name: 'Hogar' }]
    )

    expect(updates.map(update => update.name)).toEqual(['Vaso', 'Vaso', 'Vaso'])
  })
})
