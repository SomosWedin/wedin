import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  dispatch: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock('@/actions/get-current-user', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/server/import-queue', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/server/import-queue')>()),
  dispatchImportJob: mocks.dispatch,
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
// These tests never read DATABASE_URL or target an existing application DB.
const local = new PrismaClient({
  datasources: {
    db: {
      url: 'mongodb://127.0.0.1:27017/wedin_import_jobs_test?replicaSet=rs0&maxPoolSize=10',
    },
  },
})
vi.mock('@/prisma/client', () => ({
  get default() {
    return local
  },
}))

import {
  acceptAdminCollectionImport,
  getAdminCollectionImportReviewRows,
  reviewAdminCollectionImportJob,
  startAdminCollectionImportJob,
  uploadAdminCollectionImportRows,
} from '@/actions/data/collection-import'
import { processCollectionImportJob } from '@/actions/data/collection-import-worker'
import * as giftOperations from '@/actions/data/gift-operations'
import {
  acceptAdminGiftImport,
  getAdminImportJobDetails,
  getAdminImportJobs,
  getAdminImportReviewRows,
  retryAdminImportJob,
  reviewAdminImportJob,
  startAdminImportJob,
  uploadAdminImportRows,
} from '@/actions/data/import-job'
import {
  ImportBusyError,
  processImportJob,
  recordImportDeliveryFailure,
} from '@/actions/data/import-job-worker'
import { POST as workerPOST } from '@/app/api/jobs/gift-import/route'
import { up } from '@/scripts/migrations/20260906040326_gift_import_jobs'
import { up as extendImportJobs } from '@/scripts/migrations/20260906190000_extend_import_jobs_for_collections'

const admin = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Test admin',
  role: 'ADMIN',
}
const inputRow = (n: number) => ({
  rowNumber: n,
  name: `Test gift ${n}`,
  price: '1000',
  category: 'Test category',
  collections: '',
  eventTypes: '',
  imageUrl: '',
})
let categoryId = ''
async function prepare(rows = [inputRow(1)], createMissingCollections = false) {
  const started = await startAdminImportJob({
    submissionId: randomUUID(),
    filename: 'test.csv',
    expectedRows: rows.length,
    createMissingCollections,
  })
  if (!started.jobId) throw new Error(started.error)
  for (let offset = 0; offset < rows.length; offset += 20) {
    const result = await uploadAdminImportRows({
      jobId: started.jobId,
      offset,
      rows: rows.slice(offset, offset + 20),
    })
    expect(result).toEqual({ ok: true })
  }
  const reviewed = await reviewAdminImportJob(started.jobId)
  if (!('previewToken' in reviewed)) throw new Error(reviewed.error)
  return {
    jobId: started.jobId,
    previewToken: reviewed.previewToken,
    excludedRowNumbers: [] as number[],
  }
}
async function accepted(rows = [inputRow(1)], collections = false) {
  const input = await prepare(rows, collections)
  expect(await acceptAdminGiftImport(input)).toEqual({ jobId: input.jobId })
  return local.giftImportJob.findUniqueOrThrow({ where: { id: input.jobId } })
}
async function prepareCollections(
  rows: {
    rowNumber: number
    name: string
    gifts: {
      sourceKey: string
      name: string
      giftId?: string
    }[]
  }[]
) {
  const started = await startAdminCollectionImportJob({
    submissionId: randomUUID(),
    filename: 'collections.csv',
    expectedRows: rows.length,
  })
  if (!started.jobId) throw new Error(started.error)
  expect(
    await uploadAdminCollectionImportRows({
      jobId: started.jobId,
      offset: 0,
      rows,
    })
  ).toEqual({ ok: true })
  const reviewed = await reviewAdminCollectionImportJob(started.jobId)
  if (!('previewToken' in reviewed)) throw new Error(reviewed.error)
  return {
    jobId: started.jobId,
    previewToken: reviewed.previewToken,
    excludedRowNumbers: [] as number[],
  }
}

describe.skipIf(process.env.RUN_LOCAL_IMPORT_TESTS !== '1')(
  'gift import jobs with local MongoDB',
  () => {
    beforeAll(async () => {
      await up(local)
      await up(local)
      await extendImportJobs(local)
      await extendImportJobs(local)
      await local.$runCommandRaw({
        createIndexes: 'Gift',
        indexes: [
          {
            key: { nameScopeKey: 1 },
            name: 'Gift_nameScopeKey_key',
            unique: true,
          },
        ],
      })
      await local.$runCommandRaw({
        createIndexes: 'Giftlist',
        indexes: [
          {
            key: { normalizedName: 1 },
            name: 'Giftlist_normalizedName_key',
            unique: true,
          },
        ],
      })
    })
    beforeEach(async () => {
      vi.resetAllMocks()
      mocks.user.mockResolvedValue(admin)
      mocks.dispatch.mockResolvedValue(undefined)
      for (const collection of [
        'GiftImportHistory',
        'GiftImportRow',
        'GiftImportJob',
        'Image',
        'Gift',
        'Giftlist',
        'Category',
        'EventType',
      ])
        await local.$runCommandRaw({
          delete: collection,
          deletes: [{ q: {}, limit: 0 }],
        })
      const type = await local.eventType.create({
        data: { key: 'test', name: 'Test event' },
      })
      categoryId = (
        await local.category.create({
          data: {
            name: 'Test category',
            normalizedName: 'test category',
            eventTypeIds: [type.id],
          },
        })
      ).id
    })
    afterAll(async () => {
      await local.$disconnect()
    })

    it('checks current role in every action', async () => {
      mocks.user.mockResolvedValue({ ...admin, role: 'ORGANIZER' })
      for (const action of [
        startAdminImportJob,
        uploadAdminImportRows,
        reviewAdminImportJob,
        acceptAdminGiftImport,
        getAdminImportJobs,
        getAdminImportJobDetails,
        getAdminImportReviewRows,
        retryAdminImportJob,
        startAdminCollectionImportJob,
        uploadAdminCollectionImportRows,
        reviewAdminCollectionImportJob,
        acceptAdminCollectionImport,
        getAdminCollectionImportReviewRows,
      ])
        expect(await action({})).toEqual({ error: 'No autorizado.' })
      expect(await local.giftImportJob.count()).toBe(0)
      expect(mocks.dispatch).not.toHaveBeenCalled()
    })
    it('bounds requests, rejects incomplete uploads, and persists replayed chunks only once', async () => {
      const metadata = {
        submissionId: randomUUID(),
        filename: 'test.csv',
        expectedRows: 2,
        createMissingCollections: false,
      }
      const started = await startAdminImportJob(metadata)
      expect(await startAdminImportJob(metadata)).toEqual(started)
      const chunk = { jobId: started.jobId, offset: 0, rows: [inputRow(1)] }
      expect(await uploadAdminImportRows(chunk)).toEqual({ ok: true })
      expect(await uploadAdminImportRows(chunk)).toEqual({ ok: true })
      expect(
        await uploadAdminImportRows({ ...chunk, rows: [inputRow(2)] })
      ).toHaveProperty('error')
      expect(
        await uploadAdminImportRows({
          ...chunk,
          rows: Array.from({ length: 21 }, (_, i) => inputRow(i + 1)),
        })
      ).toHaveProperty('error')
      expect(await reviewAdminImportJob(started.jobId)).toHaveProperty('error')
      expect(await local.giftImportRow.count()).toBe(1)
    })
    it('returns one job for concurrent starts and acceptance requests', async () => {
      const metadata = {
        submissionId: randomUUID(),
        filename: 'concurrent.csv',
        expectedRows: 1,
        createMissingCollections: false,
      }
      const starts = await Promise.all([
        startAdminImportJob(metadata),
        startAdminImportJob(metadata),
      ])
      expect(starts[0].jobId).toBeTruthy()
      expect(starts[1]).toEqual(starts[0])
      const input = await prepare()
      const results = await Promise.all([
        acceptAdminGiftImport(input),
        acceptAdminGiftImport(input),
      ])
      expect(results).toEqual([{ jobId: input.jobId }, { jobId: input.jobId }])
      expect(mocks.dispatch).toHaveBeenCalledTimes(1)
    })
    it('pages persisted review and row history without losing the saved review token', async () => {
      const input = await prepare(
        Array.from({ length: 25 }, (_, i) => inputRow(i + 1))
      )
      const first = await getAdminImportReviewRows({
        jobId: input.jobId,
        page: 0,
      })
      const last = await getAdminImportReviewRows({
        jobId: input.jobId,
        page: 2,
      })
      expect(first.preview).toHaveLength(10)
      expect(last.preview).toHaveLength(5)
      expect(first.previewToken).toBe(input.previewToken)
      const details = await getAdminImportJobDetails({
        jobId: input.jobId,
        page: 1,
      })
      expect(details.rows).toHaveLength(5)
      expect(details.rows?.[0].rowNumber).toBe(21)
      expect(
        (
          await getAdminImportJobs({
            page: 0,
            search: 'test',
            status: 'PREPARING',
          })
        ).total
      ).toBe(1)
    })
    it('requires a fresh review token and never queues invalid or all-excluded rows', async () => {
      const input = await prepare()
      expect(
        await acceptAdminGiftImport({ ...input, previewToken: '0'.repeat(64) })
      ).toHaveProperty('error')
      expect(
        await acceptAdminGiftImport({ ...input, excludedRowNumbers: [1] })
      ).toHaveProperty('error')
      await local.category.update({
        where: { id: categoryId },
        data: { name: 'Changed' },
      })
      expect((await acceptAdminGiftImport(input)).error).toContain(
        'catálogo cambió'
      )
      expect(mocks.dispatch).not.toHaveBeenCalled()
      expect(await local.gift.count()).toBe(0)
    })
    it('requires ownership to upload, review, or accept another admin submission', async () => {
      const input = await prepare()
      mocks.user.mockResolvedValue({ ...admin, id: 'bbbbbbbbbbbbbbbbbbbbbbbb' })
      expect(await reviewAdminImportJob(input.jobId)).toHaveProperty('error')
      expect(await acceptAdminGiftImport(input)).toHaveProperty('error')
      expect(
        await uploadAdminImportRows({
          jobId: input.jobId,
          offset: 0,
          rows: [inputRow(1)],
        })
      ).toHaveProperty('error')
    })
    it('accepts once, runs without the submitting client, and ignores duplicate deliveries', async () => {
      const input = await prepare()
      expect(await acceptAdminGiftImport(input)).toEqual({ jobId: input.jobId })
      expect(await acceptAdminGiftImport(input)).toEqual({ jobId: input.jobId })
      expect(mocks.dispatch).toHaveBeenCalledTimes(1)
      expect(await local.gift.count()).toBe(0)
      const job = await local.giftImportJob.findUniqueOrThrow({
        where: { id: input.jobId },
      })
      mocks.user.mockResolvedValue(null)
      await processImportJob(job.id, job.runId)
      await processImportJob(job.id, job.runId)
      expect(await local.gift.count()).toBe(1)
      expect(
        await local.giftImportJob.findUnique({ where: { id: job.id } })
      ).toMatchObject({ status: 'COMPLETED', createdCount: 1 })
      expect(await local.giftImportRow.findFirst()).toMatchObject({
        status: 'CREATED',
        attempts: 1,
      })
    })
    it('skips a newly encountered catalog duplicate and links the existing gift', async () => {
      const job = await accepted()
      const other = await accepted()
      await processImportJob(other.id, other.runId)
      const existing = await local.gift.findFirstOrThrow()
      await processImportJob(job.id, job.runId)
      expect(await local.gift.count()).toBe(1)
      expect(
        await local.giftImportRow.findFirst({ where: { jobId: job.id } })
      ).toMatchObject({ status: 'SKIPPED', giftId: existing.id })
    })
    it('recovers interrupted processing and refuses overlapping workers or staff retries', async () => {
      const job = await accepted()
      await local.giftImportJob.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING',
          lockOwner: randomUUID(),
          lockExpiresAt: new Date(Date.now() + 90000),
        },
      })
      await expect(processImportJob(job.id, job.runId)).rejects.toBeInstanceOf(
        ImportBusyError
      )
      expect(await retryAdminImportJob(job.id)).toHaveProperty('error')
      await local.giftImportJob.update({
        where: { id: job.id },
        data: { lockExpiresAt: new Date(0) },
      })
      await processImportJob(job.id, job.runId)
      expect(await local.gift.count()).toBe(1)
    })
    it('creates collection membership and the checkpoint together', async () => {
      const job = await accepted(
        [{ ...inputRow(1), collections: 'New collection' }],
        true
      )
      await processImportJob(job.id, job.runId)
      const gift = await local.gift.findFirstOrThrow({
        include: { giftlists: true },
      })
      const collection = await local.giftlist.findFirstOrThrow()
      expect(gift.giftlists[0].id).toBe(collection.id)
      expect(collection.giftIds).toEqual([gift.id])
      expect(await local.giftImportRow.findFirst()).toMatchObject({
        giftId: gift.id,
        status: 'CREATED',
      })
    })
    it('exactly synchronizes collections without creating missing gifts', async () => {
      const oldGift = await local.gift.create({
        data: {
          name: 'Old gift',
          nameScopeKey: 'old-gift',
          price: '1000',
          isDefault: true,
          category: { connect: { id: categoryId } },
        },
      })
      const newGift = await local.gift.create({
        data: {
          name: 'New gift',
          nameScopeKey: 'new-gift',
          price: '1000',
          isDefault: true,
          category: { connect: { id: categoryId } },
        },
      })
      const collection = await local.giftlist.create({
        data: {
          name: 'Test collection',
          normalizedName: 'test collection',
          gifts: { connect: { id: oldGift.id } },
        },
      })
      const input = await prepareCollections([
        {
          rowNumber: 2,
          name: collection.name,
          gifts: [
            { sourceKey: 'new', name: newGift.name },
            { sourceKey: 'missing', name: 'Missing gift' },
          ],
        },
      ])
      expect(
        await acceptAdminCollectionImport({
          ...input,
          acknowledgeRemovals: true,
          acknowledgeIgnored: true,
        })
      ).toEqual({ jobId: input.jobId })
      const job = await local.giftImportJob.findUniqueOrThrow({
        where: { id: input.jobId },
      })
      await processCollectionImportJob(job.id, job.runId)
      await processCollectionImportJob(job.id, job.runId)
      expect(
        await local.giftlist.findUnique({ where: { id: collection.id } })
      ).toMatchObject({ giftIds: [newGift.id] })
      expect(await local.gift.count()).toBe(2)
      expect(
        await local.giftImportJob.findUnique({ where: { id: job.id } })
      ).toMatchObject({ status: 'COMPLETED', updatedCount: 1 })
      expect(await local.giftImportRow.findFirst()).toMatchObject({
        status: 'UPDATED',
        collectionId: collection.id,
      })
    })
    it('does not overwrite a collection changed after acceptance', async () => {
      const reviewedGift = await local.gift.create({
        data: {
          name: 'Reviewed gift',
          nameScopeKey: 'reviewed-gift',
          price: '1000',
          isDefault: true,
          category: { connect: { id: categoryId } },
        },
      })
      const laterGift = await local.gift.create({
        data: {
          name: 'Later gift',
          nameScopeKey: 'later-gift',
          price: '1000',
          isDefault: true,
          category: { connect: { id: categoryId } },
        },
      })
      const collection = await local.giftlist.create({
        data: { name: 'Changing', normalizedName: 'changing' },
      })
      const input = await prepareCollections([
        {
          rowNumber: 2,
          name: collection.name,
          gifts: [{ sourceKey: 'reviewed', name: reviewedGift.name }],
        },
      ])
      expect(
        await acceptAdminCollectionImport({
          ...input,
          acknowledgeRemovals: false,
          acknowledgeIgnored: false,
        })
      ).toEqual({ jobId: input.jobId })
      await local.giftlist.update({
        where: { id: collection.id },
        data: { gifts: { set: [{ id: laterGift.id }] } },
      })
      const job = await local.giftImportJob.findUniqueOrThrow({
        where: { id: input.jobId },
      })
      await processCollectionImportJob(job.id, job.runId)
      expect(
        await local.giftlist.findUnique({ where: { id: collection.id } })
      ).toMatchObject({ giftIds: [laterGift.id] })
      expect(await local.giftImportRow.findFirst()).toMatchObject({
        status: 'FAILED',
        error: expect.stringContaining('cambió después de la revisión'),
      })
    })
    it('revalidates collection compatibility, continues other rows, and retries only failed work', async () => {
      const input = await prepare(
        [{ ...inputRow(1), collections: 'New collection' }, inputRow(2)],
        true
      )
      const job = await acceptAdminGiftImport(input)
      expect(job).toHaveProperty('jobId')
      const state = await local.giftImportJob.findUniqueOrThrow({
        where: { id: input.jobId },
      })
      const type = await local.eventType.create({
        data: { key: 'other', name: 'Other' },
      })
      const category = await local.category.create({
        data: {
          name: 'Other',
          normalizedName: 'other',
          eventTypeIds: [type.id],
        },
      })
      const collection = await local.giftlist.create({
        data: { name: 'New collection', normalizedName: 'new collection' },
      })
      await local.gift.create({
        data: {
          name: 'Other',
          nameScopeKey: 'other',
          price: '1000',
          isDefault: true,
          category: { connect: { id: category.id } },
          giftlists: { connect: { id: collection.id } },
        },
      })
      await processImportJob(state.id, state.runId)
      expect(
        await local.giftImportJob.findUnique({ where: { id: state.id } })
      ).toMatchObject({
        status: 'COMPLETED_WITH_ERRORS',
        createdCount: 1,
        failedCount: 1,
      })
      const priorHistory = await local.giftImportHistory.count({
        where: { jobId: state.id },
      })
      const compatible = await local.category.findUniqueOrThrow({
        where: { id: categoryId },
      })
      await local.category.update({
        where: { id: category.id },
        data: { eventTypeIds: compatible.eventTypeIds },
      })
      expect(await retryAdminImportJob(state.id)).toEqual({ ok: true })
      const retry = await local.giftImportJob.findUniqueOrThrow({
        where: { id: state.id },
      })
      await recordImportDeliveryFailure(state.id, state.runId)
      await processImportJob(state.id, state.runId)
      expect(
        await local.giftImportJob.findUnique({ where: { id: state.id } })
      ).toMatchObject({ status: 'QUEUED' })
      await processImportJob(retry.id, retry.runId)
      expect(
        await local.giftImportJob.findUnique({ where: { id: state.id } })
      ).toMatchObject({ status: 'COMPLETED', createdCount: 2, failedCount: 0 })
      expect(
        await local.giftImportRow.findFirst({
          where: { jobId: state.id, rowNumber: 2 },
        })
      ).toMatchObject({ attempts: 1 })
      expect(
        await local.giftImportHistory.count({ where: { jobId: state.id } })
      ).toBeGreaterThan(priorHistory)
    })
    it('keeps exclusions and successful checkpoints across exhausted deliveries and retries', async () => {
      const input = await prepare([inputRow(1), { ...inputRow(2), name: '' }])
      expect(
        await acceptAdminGiftImport({ ...input, excludedRowNumbers: [2] })
      ).toHaveProperty('jobId')
      const job = await local.giftImportJob.findUniqueOrThrow({
        where: { id: input.jobId },
      })
      await recordImportDeliveryFailure(job.id, job.runId)
      expect(
        await local.giftImportJob.findUnique({ where: { id: job.id } })
      ).toMatchObject({ status: 'FAILED' })
      await retryAdminImportJob(job.id)
      const retry = await local.giftImportJob.findUniqueOrThrow({
        where: { id: job.id },
      })
      await processImportJob(retry.id, retry.runId)
      expect(
        await local.giftImportJob.findUnique({ where: { id: job.id } })
      ).toMatchObject({ status: 'COMPLETED', createdCount: 1, skippedCount: 1 })
      expect(
        await local.giftImportRow.findFirst({
          where: { jobId: job.id, rowNumber: 2 },
        })
      ).toMatchObject({ status: 'SKIPPED', excluded: true, attempts: 0 })
    })
    it('caps each delivery at 50 rows and persists progress between messages', async () => {
      const job = await accepted(
        Array.from({ length: 51 }, (_, i) => inputRow(i + 1))
      )
      await processImportJob(job.id, job.runId)
      const partial = await local.giftImportJob.findUniqueOrThrow({
        where: { id: job.id },
      })
      expect(partial.createdCount).toBeGreaterThan(0)
      expect(partial.createdCount).toBeLessThanOrEqual(50)
      expect(partial.status).toBe('QUEUED')
      expect(mocks.dispatch).toHaveBeenLastCalledWith(job.id, job.runId)
      await processImportJob(job.id, job.runId)
      expect(
        await local.giftImportJob.findUnique({ where: { id: job.id } })
      ).toMatchObject({ status: 'COMPLETED', createdCount: 51 })
    }, 30000)
    it('records exhausted deliveries before lease expiry without unlocking an active worker', async () => {
      const job = await accepted()
      const owner = randomUUID()
      const expires = new Date(Date.now() + 90000)
      await local.giftImportJob.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING',
          lockOwner: owner,
          lockExpiresAt: expires,
        },
      })
      await recordImportDeliveryFailure(job.id, job.runId)
      await recordImportDeliveryFailure(job.id, job.runId)
      expect(
        await local.giftImportJob.findUnique({ where: { id: job.id } })
      ).toMatchObject({
        status: 'FAILED',
        lockOwner: owner,
        lockExpiresAt: expires,
      })
      expect(await retryAdminImportJob(job.id)).toHaveProperty('error')
      expect(
        await local.giftImportHistory.count({
          where: { jobId: job.id, message: { contains: 'agotaron' } },
        })
      ).toBe(1)
      await local.giftImportJob.update({
        where: { id: job.id },
        data: { lockExpiresAt: new Date(0) },
      })
      expect(await retryAdminImportJob(job.id)).toEqual({ ok: true })
    })

    it('does not recreate a deleted reviewed collection under its database ID', async () => {
      const collection = await local.giftlist.create({
        data: {
          name: 'Reviewed collection',
          normalizedName: 'reviewed collection',
        },
      })
      const job = await accepted(
        [{ ...inputRow(1), collections: collection.name }],
        true
      )
      await local.giftlist.delete({ where: { id: collection.id } })
      await processImportJob(job.id, job.runId)
      expect(await local.giftlist.count()).toBe(0)
      expect(await local.gift.count()).toBe(0)
      expect(await local.giftImportRow.findFirst()).toMatchObject({
        status: 'FAILED',
        error: 'Una o más colecciones seleccionadas no existen.',
      })
    })

    it('rolls back gifts and collections if processing fails before its checkpoint', async () => {
      const job = await accepted(
        [{ ...inputRow(1), collections: 'Atomic collection' }],
        true
      )
      const create = giftOperations.createGiftRecord
      const spy = vi
        .spyOn(giftOperations, 'createGiftRecord')
        .mockImplementationOnce(async (...args) => {
          await create(...args)
          throw new Error('private infrastructure response')
        })
      await expect(processImportJob(job.id, job.runId)).rejects.toThrow()
      spy.mockRestore()
      expect(await local.gift.count()).toBe(0)
      expect(await local.giftlist.count()).toBe(0)
      expect(await local.giftImportRow.findFirst()).toMatchObject({
        status: 'PENDING',
        attempts: 0,
      })
      expect(
        JSON.stringify(await local.giftImportHistory.findMany())
      ).not.toContain('private infrastructure')
      await processImportJob(job.id, job.runId, 1)
      expect(await local.gift.count()).toBe(1)
      expect(await local.giftlist.count()).toBe(1)
    })

    it.skipIf(process.env.RUN_LOCAL_QSTASH_TESTS !== '1')(
      'delivers through the real local QStash server after the submitting client goes away',
      async () => {
        const actualQueue = await vi.importActual<
          typeof import('@/lib/server/import-queue')
        >('@/lib/server/import-queue')
        mocks.dispatch.mockImplementation(actualQueue.dispatchImportJob)
        const server = createServer(async (req, res) => {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers))
            if (value)
              headers.set(key, Array.isArray(value) ? value.join(',') : value)
          const request = new Request(
            `http://localhost:${(server.address() as { port: number }).port}${req.url}`,
            { method: 'POST', headers, body: Buffer.concat(chunks).toString() }
          )
          const response = await workerPOST(request)
          res.writeHead(response.status)
          res.end(await response.text())
        })
        await new Promise<void>(resolve => server.listen(0, resolve))
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('VERCEL', '')
        vi.stubEnv(
          'QSTASH_CALLBACK_URL',
          `http://localhost:${(server.address() as { port: number }).port}`
        )
        try {
          const job = await accepted([inputRow(1), inputRow(2)])
          mocks.user.mockResolvedValue(null)
          await vi.waitFor(
            async () => {
              expect(
                await local.giftImportJob.findUnique({ where: { id: job.id } })
              ).toMatchObject({ status: 'COMPLETED', createdCount: 2 })
            },
            { timeout: 45000, interval: 250 }
          )
          expect(await local.gift.count()).toBe(2)
        } finally {
          vi.unstubAllEnvs()
          await new Promise<void>((resolve, reject) =>
            server.close(error => (error ? reject(error) : resolve()))
          )
        }
      },
      90000
    )
  }
)
