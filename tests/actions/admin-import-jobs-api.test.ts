import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  details: vi.fn(),
  retry: vi.fn(),
  cancel: vi.fn(),
}))

vi.mock('@/actions/data/import-job', () => ({
  getAdminImportJobs: mocks.list,
  getAdminImportJobDetails: mocks.details,
  retryAdminImportJob: mocks.retry,
  cancelAdminImportJob: mocks.cancel,
}))

import { POST as cancelJob } from '@/app/api/admin/import-jobs/[id]/cancel/route'
import { POST as retryJob } from '@/app/api/admin/import-jobs/[id]/retry/route'
import { GET as jobDetails } from '@/app/api/admin/import-jobs/[id]/route'
import { GET as listJobs } from '@/app/api/admin/import-jobs/route'

describe('admin import jobs HTTP boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.list.mockResolvedValue({ jobs: [], total: 0 })
    mocks.details.mockResolvedValue({ error: 'Importación no encontrada.' })
    mocks.retry.mockResolvedValue({ jobId: 'aaaaaaaaaaaaaaaaaaaaaaaa' })
    mocks.cancel.mockResolvedValue({ ok: true })
  })

  it('loads filtered jobs through a stable GET endpoint', async () => {
    const response = await listJobs(
      new Request(
        'https://app.example.test/api/admin/import-jobs?page=2&search=luna&status=QUEUED&kind=COLLECTION'
      )
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ jobs: [], total: 0 })
    expect(mocks.list).toHaveBeenCalledWith({
      page: 2,
      search: 'luna',
      status: 'QUEUED',
      kind: 'COLLECTION',
    })
  })

  it('loads paginated details through a stable GET endpoint', async () => {
    const response = await jobDetails(
      new Request(
        'https://app.example.test/api/admin/import-jobs/aaaaaaaaaaaaaaaaaaaaaaaa?page=3&historyPage=4'
      ),
      { params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.details).toHaveBeenCalledWith({
      jobId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      page: 3,
      historyPage: 4,
    })
  })

  it('retries only same-origin requests through the stable endpoint', async () => {
    const url =
      'https://app.example.test/api/admin/import-jobs/aaaaaaaaaaaaaaaaaaaaaaaa/retry'
    const accepted = await retryJob(
      new Request(url, {
        method: 'POST',
        headers: { origin: 'https://app.example.test' },
      }),
      { params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } }
    )
    const rejected = await retryJob(
      new Request(url, {
        method: 'POST',
        headers: { origin: 'https://other.example.test' },
      }),
      { params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } }
    )

    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toEqual({
      jobId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    })
    expect(rejected.status).toBe(403)
    expect(mocks.retry).toHaveBeenCalledTimes(1)
    expect(mocks.retry).toHaveBeenCalledWith('aaaaaaaaaaaaaaaaaaaaaaaa')
  })

  it('cancels only same-origin requests through the stable endpoint', async () => {
    const url =
      'https://app.example.test/api/admin/import-jobs/aaaaaaaaaaaaaaaaaaaaaaaa/cancel'
    const accepted = await cancelJob(
      new Request(url, {
        method: 'POST',
        headers: { origin: 'https://app.example.test' },
      }),
      { params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } }
    )
    const rejected = await cancelJob(
      new Request(url, {
        method: 'POST',
        headers: { origin: 'https://other.example.test' },
      }),
      { params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } }
    )

    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toEqual({ ok: true })
    expect(rejected.status).toBe(403)
    expect(mocks.cancel).toHaveBeenCalledTimes(1)
    expect(mocks.cancel).toHaveBeenCalledWith('aaaaaaaaaaaaaaaaaaaaaaaa')
  })
})
