import type { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { previewCollectionRows } from '@/actions/data/collection-import-preview'

const existingGift = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Cena existente',
  isDefault: true,
  category: {
    name: 'Luna de miel',
    eventTypeIds: ['wedding'],
  },
}
const addedGift = {
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  name: 'Nueva experiencia',
  isDefault: true,
  category: {
    name: 'Luna de miel',
    eventTypeIds: ['wedding'],
  },
}

function client({ incompatible = false } = {}) {
  return {
    giftlist: {
      findMany: async () => [
        {
          id: 'cccccccccccccccccccccccc',
          name: 'París',
          normalizedName: 'parís',
          giftIds: [existingGift.id],
        },
      ],
    },
    gift: {
      findMany: async () => [
        existingGift,
        incompatible
          ? {
              ...addedGift,
              category: {
                name: 'Bebés',
                eventTypeIds: ['baby-shower'],
              },
            }
          : addedGift,
      ],
    },
    eventType: {
      findMany: async () => [
        { id: 'wedding', name: 'Casamiento' },
        { id: 'baby-shower', name: 'Baby Shower' },
      ],
    },
  } as unknown as Prisma.TransactionClient
}

describe('collection import preview', () => {
  it('shows exact additions, removals and ignored missing gifts without writes', async () => {
    const [result] = await previewCollectionRows(client(), [
      {
        rowNumber: 2,
        name: 'París',
        gifts: [
          { sourceKey: 'new', name: addedGift.name },
          { sourceKey: 'missing', name: 'No existe' },
        ],
      },
    ])
    expect(result.action).toBe('update')
    expect(result.added.map(gift => gift.id)).toEqual([addedGift.id])
    expect(result.removed.map(gift => gift.id)).toEqual([existingGift.id])
    expect(result.ignored).toEqual([
      {
        name: 'No existe',
        reason: 'No se encontró en el catálogo y no se agregará.',
      },
    ])
    expect(result.values).toMatchObject({
      collectionId: 'cccccccccccccccccccccccc',
      expectedGiftIds: [existingGift.id],
      targetGiftIds: [addedGift.id],
    })
  })

  it('rejects a new collection with no resolved gifts', async () => {
    const [result] = await previewCollectionRows(client(), [
      {
        rowNumber: 3,
        name: 'Nueva',
        gifts: [{ sourceKey: 'missing', name: 'No existe' }],
      },
    ])
    expect(result.action).toBe('invalid')
    expect(result.errors.join()).toContain('sin al menos un regalo')
  })

  it('reuses collection compatibility rules for the final membership', async () => {
    const [result] = await previewCollectionRows(
      client({ incompatible: true }),
      [
        {
          rowNumber: 2,
          name: 'París',
          gifts: [
            { sourceKey: 'old', name: existingGift.name },
            { sourceKey: 'new', name: addedGift.name },
          ],
        },
      ]
    )
    expect(result.action).toBe('invalid')
    expect(result.errors).toContain(
      'Los regalos no comparten ningún tipo de evento.'
    )
  })
})
