import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  findJob: vi.fn(),
  dispatch: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/server/import-queue', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/server/import-queue')>()),
  dispatchImportJob: mocks.dispatch,
}))
vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: mocks.transaction,
    giftImportJob: { findUnique: mocks.findJob },
  },
}))

import { acceptAdminCollectionImport } from '@/actions/data/collection-import'
import { acceptAdminGiftImport } from '@/actions/data/import-job'

const jobId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const runId = '11111111-1111-4111-8111-111111111111'
const previewToken = 'a'.repeat(64)
const expectedFailure = {
  error:
    'No se pudo enviar la importación a QStash. Los datos ya están guardados. Abrí Trabajos de importación en /admin/jobs y seleccioná “Reintentar pendientes y fallidos”.',
  jobId,
  queueDispatchFailed: true,
}

describe('accepted import recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.user.mockResolvedValue({
      id: 'admin',
      name: 'Test admin',
      role: 'ADMIN',
    })
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({ giftImportJob: { findUnique: mocks.findJob } })
    )
  })

  it.each([
    {
      kind: 'GIFT',
      accept: () =>
        acceptAdminGiftImport({
          jobId,
          previewToken,
          excludedRowNumbers: [],
        }),
    },
    {
      kind: 'COLLECTION',
      accept: () =>
        acceptAdminCollectionImport({
          jobId,
          previewToken,
          excludedRowNumbers: [],
          acknowledgeRemovals: false,
          acknowledgeIgnored: false,
        }),
    },
  ])(
    'does not report an already accepted failed $kind import as queued',
    async ({ kind, accept }) => {
      mocks.findJob.mockResolvedValue({
        id: jobId,
        kind,
        submittedById: 'admin',
        acceptedAt: new Date(),
        status: 'FAILED',
        runId,
      })

      await expect(accept()).resolves.toEqual(expectedFailure)
      expect(mocks.dispatch).not.toHaveBeenCalled()
    }
  )

  it('reports a QStash dispatch failure with the persisted recovery location', async () => {
    mocks.transaction.mockResolvedValue({ jobId, runId, dispatch: true })
    mocks.dispatch.mockRejectedValue(new Error('QStash unavailable'))
    mocks.findJob.mockResolvedValue({
      id: jobId,
      submittedById: 'admin',
      acceptedAt: new Date(),
      status: 'FAILED',
    })

    await expect(
      acceptAdminGiftImport({
        jobId,
        previewToken,
        excludedRowNumbers: [],
      })
    ).resolves.toEqual(expectedFailure)
  })
})
