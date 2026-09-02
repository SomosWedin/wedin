import { describe, expect, it, vi } from 'vitest'
import { up } from '@/scripts/migrations/20260829220000_backfill_event_event_types'

describe('event type backfill migration', () => {
  it('assigns wedding to every event with a missing or null event type', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'wedding-id' })
    const runCommandRaw = vi
      .fn()
      .mockResolvedValueOnce({
        cursor: { firstBatch: [{ _id: { $oid: 'wedding-id' } }] },
      })
      .mockResolvedValueOnce({ ok: 1 })
      .mockResolvedValueOnce({ n: 0 })

    await up({
      eventType: { upsert },
      $runCommandRaw: runCommandRaw,
    } as never)

    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'wedding' },
      update: {},
      create: { key: 'wedding', name: 'Casamiento' },
    })
    expect(runCommandRaw).toHaveBeenNthCalledWith(2, {
      update: 'Event',
      updates: [
        {
          q: {
            $or: [{ eventTypeId: { $exists: false } }, { eventTypeId: null }],
          },
          u: { $set: { eventTypeId: { $oid: 'wedding-id' } } },
          multi: true,
        },
      ],
    })
  })

  it('fails deployment if an event still has no event type', async () => {
    const runCommandRaw = vi
      .fn()
      .mockResolvedValueOnce({ cursor: { firstBatch: [{ _id: 'wedding' }] } })
      .mockResolvedValueOnce({ ok: 1 })
      .mockResolvedValueOnce({ n: 1 })

    await expect(
      up({
        eventType: { upsert: vi.fn() },
        $runCommandRaw: runCommandRaw,
      } as never)
    ).rejects.toThrow('1 event(s) still have no event type.')
  })
})
