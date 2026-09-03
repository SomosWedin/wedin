import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  formatMigrationTimestamp,
  normalizeMigrationName,
} from './migration-core'

export function createMigrationFile({
  rawName,
  directory = join(process.cwd(), 'scripts/migrations'),
  now = new Date(),
}: {
  rawName: string
  directory?: string
  now?: Date
}) {
  const name = normalizeMigrationName(rawName)
  const version = `${formatMigrationTimestamp(now)}_${name}`
  const filename = `${version}.ts`
  const path = join(directory, filename)

  if (existsSync(path)) {
    throw new Error(`Migration already exists: ${path}`)
  }

  mkdirSync(directory, { recursive: true })
  writeFileSync(
    path,
    `import type { PrismaClient } from '@prisma/client'\n\nexport async function up(prisma: PrismaClient) {\n  // Keep migrations idempotent so retrying after an interrupted run is safe.\n  void prisma\n}\n`
  )

  return path
}

function main() {
  const rawName = process.argv.slice(2).join(' ').trim()
  if (!rawName) {
    throw new Error('Usage: yarn migration:create <name>')
  }

  const path = createMigrationFile({ rawName })
  console.log(`Created ${path}`)
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
