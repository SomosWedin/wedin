import { describe, expect, it, vi } from 'vitest'
import { up } from '@/scripts/migrations/20260903125513_ensure_canonical_event_types'

describe('ensure canonical event types migration', () => {
  it('upserts all five canonical types by key', async () => {
    const upsert = vi.fn().mockResolvedValue({})

    await up({ eventType: { upsert } } as never)

    expect(upsert.mock.calls.map(([call]) => call.where.key)).toEqual([
      'wedding',
      'birthday',
      'baby-shower',
      'sweet-15',
      'other',
    ])
  })

  it('never renames a type that already exists', async () => {
    const upsert = vi.fn().mockResolvedValue({})

    await up({ eventType: { upsert } } as never)

    for (const [call] of upsert.mock.calls) {
      expect(call.update).toEqual({})
    }
  })

  it('creates missing types with their canonical name and no categories', async () => {
    const upsert = vi.fn().mockResolvedValue({})

    await up({ eventType: { upsert } } as never)

    expect(upsert.mock.calls.map(([call]) => call.create)).toEqual([
      { key: 'wedding', name: 'Casamiento', categoryIds: [] },
      { key: 'birthday', name: 'Cumpleaños', categoryIds: [] },
      { key: 'baby-shower', name: 'Baby shower', categoryIds: [] },
      { key: 'sweet-15', name: '15 años', categoryIds: [] },
      { key: 'other', name: 'Otro tipo de evento', categoryIds: [] },
    ])
  })
})
