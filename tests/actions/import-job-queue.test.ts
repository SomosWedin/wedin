import { createHash, createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  update: vi.fn(),
  history: vi.fn(),
  process: vi.fn(),
  failure: vi.fn(),
}))
vi.mock('@upstash/qstash', async importOriginal => {
  const original = await importOriginal<typeof import('@upstash/qstash')>()
  return {
    ...original,
    Client: class {
      publishJSON = mocks.publish
    },
  }
})
vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        giftImportJob: { updateMany: mocks.update },
        giftImportHistory: { create: mocks.history },
      }),
  },
}))
vi.mock('@/actions/data/import-job-worker', () => ({
  processImportJob: mocks.process,
  recordImportDeliveryFailure: mocks.failure,
}))

import { POST as failurePOST } from '@/app/api/jobs/gift-import/failure/route'
import { POST } from '@/app/api/jobs/gift-import/route'
import { chunkGiftImportRows } from '@/lib/gift-import'
import { dispatchImportJob, importQueueConfig } from '@/lib/server/import-queue'
import { UploadImportRowsSchema } from '@/schemas/import-job'

const jobId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const runId = '11111111-1111-4111-8111-111111111111'
const base = 'https://app.example.test'
const key = 'local-test-signing-key-not-a-real-credential'
const workerPath = '/api/jobs/gift-import'
function signed(body: string, path = workerPath, signingKey = key) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'Upstash',
      sub: base + path,
      exp: now + 60,
      nbf: now - 1,
      body: createHash('sha256').update(body).digest('base64url'),
    })
  ).toString('base64url')
  const signature = `${header}.${payload}.${createHmac('sha256', signingKey).update(`${header}.${payload}`).digest('base64url')}`
  return new Request(base + path, {
    method: 'POST',
    body,
    headers: { 'upstash-signature': signature },
  })
}

describe('QStash gift import boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('QSTASH_CALLBACK_URL', base)
    vi.stubEnv('QSTASH_CURRENT_SIGNING_KEY', key)
    vi.stubEnv('QSTASH_NEXT_SIGNING_KEY', 'rotated-test-key')
    mocks.update.mockResolvedValue({ count: 1 })
    mocks.publish.mockResolvedValue({ messageId: 'message' })
  })
  afterEach(() => vi.unstubAllEnvs())
  it('verifies real SDK signatures and only sends parsed identifiers to the worker', async () => {
    expect((await POST(signed(JSON.stringify({ jobId, runId })))).status).toBe(
      200
    )
    expect(mocks.process).toHaveBeenCalledWith(jobId, runId, 0)
  })
  it('accepts the next signing key during rotation', async () => {
    expect(
      (
        await POST(
          signed(
            JSON.stringify({ jobId, runId }),
            workerPath,
            'rotated-test-key'
          )
        )
      ).status
    ).toBe(200)
  })
  it('rejects missing, forged, modified-body, and wrong-endpoint signatures', async () => {
    const body = JSON.stringify({ jobId, runId })
    const altered = signed(body)
    for (const request of [
      new Request(base + workerPath, { method: 'POST', body }),
      signed(body, workerPath, 'invalid-key'),
      signed(body, '/different-path'),
      new Request(base + workerPath, {
        method: 'POST',
        body: '{}',
        headers: altered.headers,
      }),
    ])
      expect((await POST(request)).status).toBe(401)
    expect(mocks.process).not.toHaveBeenCalled()
  })
  it('rejects signed malformed messages and returns a retryable safe response on worker failure', async () => {
    expect((await POST(signed('{}'))).status).toBe(400)
    mocks.process.mockRejectedValue(
      new Error('mongodb://secret:password@example.test')
    )
    const response = await POST(signed(JSON.stringify({ jobId, runId })))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('password')
  })
  it('verifies failure callbacks and ignores raw infrastructure response bodies', async () => {
    const body = JSON.stringify({
      sourceBody: Buffer.from(JSON.stringify({ jobId, runId })).toString(
        'base64'
      ),
      body: 'secret infrastructure response',
    })
    expect(
      (await failurePOST(signed(body, `${workerPath}/failure`))).status
    ).toBe(200)
    expect(mocks.failure).toHaveBeenCalledWith(jobId, runId)
    expect((await failurePOST(signed(body))).status).toBe(401)
  })
  it('publishes identifiers with three retries and records safe dispatch failures', async () => {
    await dispatchImportJob(jobId, runId)
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { jobId, runId },
        retries: 3,
        failureCallback: `${base}${workerPath}/failure`,
      })
    )
    mocks.publish.mockRejectedValue(new Error('secret infrastructure response'))
    await expect(dispatchImportJob(jobId, runId)).rejects.toThrow(
      'Import dispatch failed'
    )
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: jobId, runId, status: 'QUEUED' },
        data: { status: 'FAILED' },
      })
    )
    expect(JSON.stringify(mocks.history.mock.calls)).not.toContain('secret')
  })
  it('requires HTTPS in production and never enables development mode on Vercel', () => {
    vi.stubEnv('QSTASH_CALLBACK_URL', 'http://localhost:3000')
    expect(importQueueConfig).toThrow()
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('VERCEL', '1')
    expect(importQueueConfig).toThrow()
    vi.stubEnv('VERCEL', '')
    expect(importQueueConfig().devMode).toBe(true)
  })
  it('chunks Unicode-heavy rows below the request size limit without dropping rows', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      rowNumber: i + 1,
      name: '界'.repeat(4096),
      price: '界'.repeat(4096),
      category: '界'.repeat(4096),
      collections: '界'.repeat(4096),
      eventTypes: '界'.repeat(4096),
      imageUrl: '界'.repeat(4096),
    }))
    const chunks = chunkGiftImportRows(rows)
    expect(chunks.flat()).toEqual(rows)
    for (const chunk of chunks)
      expect(
        UploadImportRowsSchema.safeParse({ jobId, offset: 0, rows: chunk })
          .success
      ).toBe(true)
  })
})
