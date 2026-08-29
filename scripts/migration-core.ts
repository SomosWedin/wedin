import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PrismaClient } from '@prisma/client'

const MIGRATION_FILENAME = /^(\d{14})_([a-z0-9]+(?:_[a-z0-9]+)*)\.ts$/
const LOCK_KEY = 'global'
const LOCK_DURATION_MS = 5 * 60 * 1000
const LOCK_RENEWAL_MS = 30 * 1000

export type MigrationFile = {
  version: string
  name: string
  path: string
  checksum: string
}

export type AppliedMigration = {
  version: string
  name: string
  checksum: string
}

export type MigrationStatus = {
  version: string
  name: string
  status: 'applied' | 'pending' | 'modified' | 'missing'
}

type MigrationModule = {
  up?: (prisma: PrismaClient) => Promise<void>
}

type MigrationClient = Pick<PrismaClient, 'migration' | 'migrationLock'>

export function normalizeMigrationName(rawName: string) {
  const name = rawName
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!name) {
    throw new Error(
      'Migration name must contain at least one letter or number.'
    )
  }

  return name
}

export function formatMigrationTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
}

export function checksumMigration(source: string | Buffer) {
  return createHash('sha256').update(source).digest('hex')
}

export function discoverMigrationFiles(
  directory = join(process.cwd(), 'scripts/migrations')
) {
  if (!existsSync(directory)) return []

  return readdirSync(directory)
    .filter(filename => filename.endsWith('.ts'))
    .sort()
    .map(filename => {
      const match = MIGRATION_FILENAME.exec(filename)
      if (!match) {
        throw new Error(
          `Invalid migration filename "${filename}". Expected YYYYMMDDHHMMSS_name.ts.`
        )
      }

      const path = join(directory, filename)
      const version = filename.replace(/\.ts$/, '')
      return {
        version,
        name: match[2],
        path,
        checksum: checksumMigration(readFileSync(path)),
      }
    })
}

export function getMigrationStatuses(
  files: MigrationFile[],
  appliedMigrations: AppliedMigration[]
) {
  const filesByVersion = new Map(files.map(file => [file.version, file]))
  const appliedByVersion = new Map(
    appliedMigrations.map(migration => [migration.version, migration])
  )
  const statuses: MigrationStatus[] = files.map(file => {
    const applied = appliedByVersion.get(file.version)
    if (!applied) {
      return { version: file.version, name: file.name, status: 'pending' }
    }
    if (applied.checksum !== file.checksum) {
      return { version: file.version, name: file.name, status: 'modified' }
    }
    return { version: file.version, name: file.name, status: 'applied' }
  })

  for (const applied of appliedMigrations) {
    if (filesByVersion.has(applied.version)) continue
    statuses.push({
      version: applied.version,
      name: applied.name,
      status: 'missing',
    })
  }

  return statuses.sort((left, right) =>
    left.version.localeCompare(right.version)
  )
}

export function assertMigrationHistory(statuses: MigrationStatus[]) {
  const modified = statuses.find(status => status.status === 'modified')
  if (modified) {
    throw new Error(
      `Applied migration ${modified.version} was modified. Restore the original file and create a new migration.`
    )
  }

  const missing = statuses.find(status => status.status === 'missing')
  if (missing) {
    throw new Error(
      `Applied migration ${missing.version} is missing from scripts/migrations.`
    )
  }
}

export async function runPendingMigrations(
  prisma: MigrationClient,
  files: MigrationFile[],
  log: (message: string) => void = console.log,
  loadMigration: (file: MigrationFile) => MigrationModule = file =>
    require(file.path) as MigrationModule
) {
  const appliedMigrations = await prisma.migration.findMany({
    select: {
      version: true,
      name: true,
      checksum: true,
    },
  })
  const statuses = getMigrationStatuses(files, appliedMigrations)
  assertMigrationHistory(statuses)

  const pendingVersions = new Set(
    statuses
      .filter(status => status.status === 'pending')
      .map(status => status.version)
  )
  const applied: string[] = []

  for (const file of files) {
    if (!pendingVersions.has(file.version)) continue

    const migration = loadMigration(file)
    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${file.version} must export up(prisma).`)
    }

    log(`Running migration ${file.version}...`)
    const startedAt = Date.now()
    await migration.up(prisma as PrismaClient)
    await prisma.migration.create({
      data: {
        version: file.version,
        name: file.name,
        checksum: file.checksum,
        durationMs: Date.now() - startedAt,
      },
    })
    applied.push(file.version)
    log(`Applied migration ${file.version}.`)
  }

  return applied
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}

async function acquireMigrationLock(
  prisma: MigrationClient,
  owner: string,
  now = new Date()
) {
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS)

  try {
    await prisma.migrationLock.create({
      data: { key: LOCK_KEY, owner, expiresAt },
    })
    return
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
  }

  const result = await prisma.migrationLock.updateMany({
    where: { key: LOCK_KEY, expiresAt: { lte: now } },
    data: { owner, expiresAt },
  })
  if (result.count !== 1) {
    throw new Error('Another migration process currently holds the lock.')
  }
}

export async function withMigrationLock<T>(
  prisma: MigrationClient,
  callback: () => Promise<T>
) {
  const owner = randomUUID()
  await acquireMigrationLock(prisma, owner)
  let renewalError: unknown
  let renewalRunning = false

  const renewal = setInterval(async () => {
    if (renewalRunning || renewalError) return
    renewalRunning = true
    try {
      const result = await prisma.migrationLock.updateMany({
        where: { key: LOCK_KEY, owner },
        data: { expiresAt: new Date(Date.now() + LOCK_DURATION_MS) },
      })
      if (result.count !== 1) {
        renewalError = new Error(
          'The migration lock was lost during execution.'
        )
      }
    } catch (error) {
      renewalError = error
    } finally {
      renewalRunning = false
    }
  }, LOCK_RENEWAL_MS)
  renewal.unref()

  try {
    const result = await callback()
    if (renewalError) throw renewalError
    return result
  } finally {
    clearInterval(renewal)
    await prisma.migrationLock.deleteMany({ where: { key: LOCK_KEY, owner } })
  }
}
