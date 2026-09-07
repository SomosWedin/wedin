import { describe, expect, it, vi } from 'vitest'
import {
  ImportBusyError,
  renewImportLease,
} from '@/actions/data/import-job-lease'

const validLease = {
  kind: 'GIFT' as const,
  runId: '11111111-1111-4111-8111-111111111111',
  lockOwner: '22222222-2222-4222-8222-222222222222',
  lockExpiresAt: new Date(Date.now() + 60_000),
}

describe('import worker lease renewal', () => {
  it('validates the transactional snapshot and renews by unique job id', async () => {
    const findUnique = vi.fn().mockResolvedValue(validLease)
    const update = vi.fn().mockResolvedValue({})
    const tx = { giftImportJob: { findUnique, update } }

    await renewImportLease(
      tx as never,
      'aaaaaaaaaaaaaaaaaaaaaaaa',
      validLease.runId,
      validLease.lockOwner,
      'GIFT'
    )

    expect(update).toHaveBeenCalledWith({
      where: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
      data: { lockExpiresAt: expect.any(Date) },
    })
  })

  it.each([
    { ...validLease, kind: 'COLLECTION' as const },
    { ...validLease, runId: 'different' },
    { ...validLease, lockOwner: 'different' },
    { ...validLease, lockExpiresAt: new Date(0) },
    null,
  ])('rejects an invalid or expired transactional lease', async lease => {
    const tx = {
      giftImportJob: {
        findUnique: vi.fn().mockResolvedValue(lease),
        update: vi.fn(),
      },
    }

    await expect(
      renewImportLease(
        tx as never,
        'aaaaaaaaaaaaaaaaaaaaaaaa',
        validLease.runId,
        validLease.lockOwner,
        'GIFT'
      )
    ).rejects.toBeInstanceOf(ImportBusyError)
    expect(tx.giftImportJob.update).not.toHaveBeenCalled()
  })
})
