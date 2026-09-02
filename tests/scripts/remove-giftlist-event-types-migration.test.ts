import { expect, it, vi } from 'vitest'
import { up } from '@/scripts/migrations/20260830140000_remove_giftlist_event_types'

it('removes the obsolete collection event-type fields from both sides', async () => {
  const runCommandRaw = vi.fn().mockResolvedValue({ ok: 1 })

  await up({ $runCommandRaw: runCommandRaw } as never)

  expect(runCommandRaw).toHaveBeenNthCalledWith(1, {
    update: 'Giftlist',
    updates: [
      {
        q: { eventTypeIds: { $exists: true } },
        u: { $unset: { eventTypeIds: '' } },
        multi: true,
      },
    ],
  })
  expect(runCommandRaw).toHaveBeenNthCalledWith(2, {
    update: 'EventType',
    updates: [
      {
        q: { giftlistIds: { $exists: true } },
        u: { $unset: { giftlistIds: '' } },
        multi: true,
      },
    ],
  })
})
