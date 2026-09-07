import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryFindUnique: vi.fn(),
  eventTypeFindMany: vi.fn(),
  giftlistFindMany: vi.fn(),
  giftlistCreate: vi.fn(),
  giftFindMany: vi.fn(),
  giftFindFirst: vi.fn(),
  giftCreate: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}))
vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/prisma/client', () => ({
  default: {
    category: {
      findMany: mocks.categoryFindMany,
      findUnique: mocks.categoryFindUnique,
    },
    eventType: { findMany: mocks.eventTypeFindMany },
    giftlist: {
      findMany: mocks.giftlistFindMany,
      create: mocks.giftlistCreate,
    },
    gift: {
      findMany: mocks.giftFindMany,
      findFirst: mocks.giftFindFirst,
      create: mocks.giftCreate,
    },
    $transaction: mocks.transaction,
  },
}))

import {
  getExistingImportGift,
  previewAdminGiftImport,
} from '@/actions/data/gift-import'
import { buildGiftNameScopeKey } from '@/lib/gift-name'
import prismaClient from '@/prisma/client'

const row = {
  rowNumber: 2,
  name: 'Sofá',
  price: '150.000',
  category: 'Hogar',
  collections: 'Primera casa',
  eventTypes: 'Casamiento',
  imageUrl: 'https://example.com/image.jpg',
}

const previewAdminGiftRows = (
  rows: unknown[],
  createMissingCollections = false
) => previewAdminGiftImport({ rows, createMissingCollections })

describe('admin gift import actions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin', role: 'ADMIN' })
    mocks.categoryFindMany.mockResolvedValue([
      { id: 'home', name: 'Hogar', eventTypeIds: ['wedding'] },
    ])
    mocks.categoryFindUnique.mockResolvedValue({
      id: 'home',
      eventTypeIds: ['wedding'],
    })
    mocks.eventTypeFindMany.mockResolvedValue([
      { id: 'wedding', name: 'Casamiento', key: 'WEDDING' },
    ])
    mocks.giftlistFindMany.mockResolvedValue([
      { id: 'starter', name: 'Primera casa', gifts: [] },
    ])
    mocks.giftlistCreate.mockResolvedValue({ id: 'new-giftlist' })
    mocks.giftFindMany.mockResolvedValue([])
    mocks.giftCreate.mockResolvedValue({ id: 'new-gift' })
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => callback(prismaClient)
    )
  })

  it('previews without performing writes', async () => {
    const result = await previewAdminGiftRows([row])
    expect(result.preview?.[0].errors).toEqual([])
    expect(result.preview?.[0].values?.price).toBe('150000')
    expect(mocks.giftCreate).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('links only database duplicates to their exact saved gift', async () => {
    const savedId = '1234567890abcdef12345678'
    mocks.giftFindMany.mockResolvedValue([
      {
        id: savedId,
        nameScopeKey: buildGiftNameScopeKey({
          name: row.name,
          categoryId: 'home',
          isDefault: true,
        }),
      },
    ])
    const result = await previewAdminGiftRows([
      row,
      { ...row, rowNumber: 3, name: 'Mesa' },
      { ...row, rowNumber: 4, name: 'Mesa' },
    ])
    expect(result.preview?.[0].existingGiftId).toBe(savedId)
    expect(result.preview?.[1].existingGiftId).toBeUndefined()
    expect(result.preview?.[2].existingGiftId).toBeUndefined()
    expect(result.preview?.[1].errors.join()).toContain('Nombre repetido')
  })

  it.each([undefined, { role: 'ORGANIZER' }])(
    'authorizes existing gift details before database access',
    async user => {
      mocks.getCurrentUser.mockResolvedValue(user)
      expect(await getExistingImportGift('1234567890abcdef12345678')).toEqual({
        error: 'No autorizado.',
      })
      expect(mocks.giftFindFirst).not.toHaveBeenCalled()
    }
  )

  it('loads saved catalog data instead of CSV values', async () => {
    const gift = {
      id: '1234567890abcdef12345678',
      name: 'SOFÁ',
      price: '200000',
      image: { url: 'https://example.com/saved.jpg' },
      category: { name: 'Hogar', eventTypes: [{ name: 'Casamiento' }] },
      giftlists: [{ name: 'Favoritos' }],
    }
    mocks.giftFindFirst.mockResolvedValue(gift)
    expect(await getExistingImportGift(gift.id)).toEqual({ gift })
    expect(mocks.giftFindFirst).toHaveBeenCalledWith({
      where: { id: gift.id, isDefault: true },
      select: expect.objectContaining({
        image: { select: { url: true } },
        giftlists: { select: { name: true } },
      }),
    })
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('handles invalid IDs, deleted gifts and read failures', async () => {
    expect((await getExistingImportGift('invalid')).error).toBe(
      'Regalo inválido.'
    )
    expect(mocks.giftFindFirst).not.toHaveBeenCalled()
    mocks.giftFindFirst.mockResolvedValue(null)
    expect(
      (await getExistingImportGift('1234567890abcdef12345678')).error
    ).toContain('ya no existe')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.giftFindFirst.mockRejectedValue(new Error('offline'))
    expect(
      (await getExistingImportGift('1234567890abcdef12345678')).error
    ).toContain('No se pudo cargar')
    log.mockRestore()
  })

  it('supports reviewing from a tab opened before the collection option was added', async () => {
    const reviewed = await previewAdminGiftImport([row])
    expect(reviewed.error).toBeUndefined()
    expect(reviewed.preview?.[0].errors).toEqual([])
    expect(mocks.giftCreate).not.toHaveBeenCalled()
  })

  it('still validates legacy array rows and requires opting in to new collections', async () => {
    const invalid = await previewAdminGiftImport([{ ...row, isDefault: false }])
    expect(invalid.error).toBeTruthy()
    expect(mocks.categoryFindMany).not.toHaveBeenCalled()

    const unmatched = await previewAdminGiftImport([
      { ...row, collections: 'Missing collection' },
    ])
    expect(unmatched.preview?.[0].errors.join()).toContain(
      'Colección sin coincidencia'
    )
    expect(mocks.giftlistCreate).not.toHaveBeenCalled()
  })
})
