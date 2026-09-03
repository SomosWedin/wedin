import { describe, expect, it, vi } from 'vitest'
import { up } from '@/scripts/migrations/20260903120959_adopt_canonical_event_type_keys'

function buildPrisma(rows: { id: string; key: string; name: string }[]) {
  const update = vi.fn().mockResolvedValue({})
  return {
    prisma: {
      eventType: { findMany: vi.fn().mockResolvedValue(rows), update },
    } as never,
    update,
  }
}

describe('canonical event type keys migration', () => {
  const liveRows = [
    { id: 'a', key: 'fkdsjflsdjakf', name: '15 años' },
    { id: 'b', key: 'baby-shower', name: 'Baby Shower' },
    { id: 'c', key: 'wedding', name: 'Casamiento' },
    { id: 'd', key: 'other', name: 'Cumpleaños' },
    { id: 'e', key: 'otro', name: 'Otros' },
  ]

  it('adopts the canonical key for every unambiguously named row', async () => {
    const { prisma, update } = buildPrisma(liveRows.map(row => ({ ...row })))

    await up(prisma)

    expect(update.mock.calls.map(([call]) => call)).toEqual([
      { where: { id: 'd' }, data: { key: 'birthday' } },
      { where: { id: 'a' }, data: { key: 'sweet-15' } },
      { where: { id: 'e' }, data: { key: 'other' } },
    ])
  })

  it('frees the other key before handing it to Otros', async () => {
    const { prisma, update } = buildPrisma(liveRows.map(row => ({ ...row })))

    await up(prisma)

    const birthdayIndex = update.mock.calls.findIndex(
      ([call]) => call.data.key === 'birthday'
    )
    const otherIndex = update.mock.calls.findIndex(
      ([call]) => call.data.key === 'other'
    )
    expect(birthdayIndex).toBeLessThan(otherIndex)
  })

  it('is a no-op on an already migrated database', async () => {
    const { prisma, update } = buildPrisma([
      { id: 'a', key: 'sweet-15', name: '15 años' },
      { id: 'b', key: 'baby-shower', name: 'Baby Shower' },
      { id: 'c', key: 'wedding', name: 'Casamiento' },
      { id: 'd', key: 'birthday', name: 'Cumpleaños' },
      { id: 'e', key: 'other', name: 'Otros' },
    ])

    await up(prisma)

    expect(update).not.toHaveBeenCalled()
  })

  it('leaves a database whose names differ untouched', async () => {
    const { prisma, update } = buildPrisma([
      { id: 'c', key: 'wedding', name: 'Casamiento' },
      { id: 'd', key: 'other', name: 'Otro tipo de evento' },
    ])

    await up(prisma)

    expect(update).not.toHaveBeenCalled()
  })

  it('refuses to rename when two rows share a name', async () => {
    const { prisma, update } = buildPrisma([
      { id: 'x', key: 'junk-1', name: '15 años' },
      { id: 'y', key: 'junk-2', name: '15 Años' },
    ])

    await up(prisma)

    expect(update).not.toHaveBeenCalled()
  })
})
