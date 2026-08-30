import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMigrationFile } from '../../scripts/create-migration'
import {
  assertMigrationHistory,
  checksumMigration,
  discoverMigrationFiles,
  getMigrationStatuses,
  type MigrationFile,
  normalizeMigrationName,
  runPendingMigrations,
  withMigrationLock,
} from '../../scripts/migration-core'

const temporaryDirectories: string[] = []

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'wedin-migrations-'))
  temporaryDirectories.push(directory)
  return directory
}

function migrationFile(
  version: string,
  name = version.replace(/^\d{14}_/, '')
): MigrationFile {
  return {
    version,
    name,
    path: `/migrations/${version}.ts`,
    checksum: checksumMigration(version),
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('migration generator and discovery', () => {
  it('creates a Rails-style timestamped migration with a normalized name', () => {
    const directory = temporaryDirectory()
    const path = createMigrationFile({
      rawName: 'Add Status to Gifts',
      directory,
      now: new Date('2026-08-29T19:45:30.000Z'),
    })

    expect(basename(path)).toBe('20260829194530_add_status_to_gifts.ts')
    expect(readFileSync(path, 'utf8')).toContain(
      'export async function up(prisma: PrismaClient)'
    )
    expect(() =>
      createMigrationFile({
        rawName: 'Add Status to Gifts',
        directory,
        now: new Date('2026-08-29T19:45:30.000Z'),
      })
    ).toThrow('Migration already exists')
  })

  it('rejects empty names and malformed migration filenames', () => {
    expect(() => normalizeMigrationName('___')).toThrow(
      'at least one letter or number'
    )

    const directory = temporaryDirectory()
    writeFileSync(join(directory, 'add_gift_field.ts'), 'export {}')
    expect(() => discoverMigrationFiles(directory)).toThrow(
      'Expected YYYYMMDDHHMMSS_name.ts'
    )
  })

  it('discovers migration files in timestamp order and calculates checksums', () => {
    const directory = temporaryDirectory()
    writeFileSync(join(directory, '20260830100000_second_change.ts'), 'second')
    writeFileSync(join(directory, '20260829100000_first_change.ts'), 'first')
    writeFileSync(join(directory, 'README.md'), 'ignored')

    const files = discoverMigrationFiles(directory)
    expect(files.map(file => file.name)).toEqual([
      'first_change',
      'second_change',
    ])
    expect(files[0].checksum).toBe(checksumMigration('first'))
  })
})

describe('migration history', () => {
  it('reports applied, pending, modified, and missing migrations', () => {
    const applied = migrationFile('20260829100000_applied')
    const modified = migrationFile('20260829110000_modified')
    const statuses = getMigrationStatuses(
      [applied, modified, migrationFile('20260829120000_pending')],
      [
        {
          version: applied.version,
          name: applied.name,
          checksum: applied.checksum,
        },
        {
          version: modified.version,
          name: modified.name,
          checksum: 'old-checksum',
        },
        {
          version: '20260828090000_missing',
          name: 'missing',
          checksum: 'checksum',
        },
      ]
    )

    expect(
      Object.fromEntries(
        statuses.map(status => [status.version, status.status])
      )
    ).toEqual({
      '20260828090000_missing': 'missing',
      '20260829100000_applied': 'applied',
      '20260829110000_modified': 'modified',
      '20260829120000_pending': 'pending',
    })
    expect(() => assertMigrationHistory(statuses)).toThrow('was modified')
  })

  it('runs pending migrations in order and records each only after success', async () => {
    const files = [
      migrationFile('20260829100000_first'),
      migrationFile('20260829110000_second'),
      migrationFile('20260829120000_third'),
    ]
    const calls: string[] = []
    const migrationCreate = vi.fn(async ({ data }) => {
      calls.push(`record:${data.name}`)
    })
    const prisma = {
      migration: {
        findMany: vi.fn().mockResolvedValue([]),
        create: migrationCreate,
      },
    }

    await expect(
      runPendingMigrations(
        prisma as never,
        files,
        () => undefined,
        file => ({
          up: async () => {
            calls.push(`run:${file.name}`)
            if (file.name === 'second') throw new Error('migration failed')
          },
        })
      )
    ).rejects.toThrow('migration failed')

    expect(calls).toEqual(['run:first', 'record:first', 'run:second'])
    expect(migrationCreate).toHaveBeenCalledOnce()
  })

  it('does not rerun an already-applied migration', async () => {
    const file = migrationFile('20260829100000_applied')
    const up = vi.fn()
    const prisma = {
      migration: {
        findMany: vi.fn().mockResolvedValue([
          {
            version: file.version,
            name: file.name,
            checksum: file.checksum,
          },
        ]),
        create: vi.fn(),
      },
    }

    expect(
      await runPendingMigrations(
        prisma as never,
        [file],
        () => undefined,
        () => ({ up })
      )
    ).toEqual([])
    expect(up).not.toHaveBeenCalled()
  })
})

describe('migration locking', () => {
  it('keeps renewing after a transient renewal failure', async () => {
    vi.useFakeTimers()

    const lockedError = Object.assign(new Error('duplicate'), { code: 'P2002' })
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('temporary database failure'))
      .mockResolvedValue({ count: 1 })
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      migrationLock: {
        create: vi.fn().mockRejectedValue(lockedError),
        updateMany,
        deleteMany,
      },
    }

    let release!: () => void
    const callback = new Promise<void>(resolve => {
      release = resolve
    })
    const running = withMigrationLock(prisma as never, () => callback)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(updateMany).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(updateMany).toHaveBeenCalledTimes(3)

    release()
    await expect(running).resolves.toBeUndefined()
  })

  it('rejects a second runner while an active migration lock exists', async () => {
    const lockedError = Object.assign(new Error('duplicate'), { code: 'P2002' })
    const callback = vi.fn()
    const prisma = {
      migrationLock: {
        create: vi.fn().mockRejectedValue(lockedError),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        deleteMany: vi.fn(),
      },
    }

    await expect(withMigrationLock(prisma as never, callback)).rejects.toThrow(
      'Another migration process currently holds the lock'
    )
    expect(callback).not.toHaveBeenCalled()
  })

  it('takes over an expired lock and releases it after the migration run', async () => {
    const lockedError = Object.assign(new Error('duplicate'), { code: 'P2002' })
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      migrationLock: {
        create: vi.fn().mockRejectedValue(lockedError),
        updateMany,
        deleteMany,
      },
    }

    await expect(
      withMigrationLock(prisma as never, async () => 'complete')
    ).resolves.toBe('complete')
    expect(updateMany).toHaveBeenCalledOnce()
    expect(deleteMany).toHaveBeenCalledWith({
      where: { key: 'global', owner: expect.any(String) },
    })
  })
})
