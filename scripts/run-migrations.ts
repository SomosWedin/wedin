import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const tsNode = join(process.cwd(), 'node_modules/.bin/ts-node')
const compilerOptions = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
})

const legacyMigrations = [
  { name: '001_migrate_event_types', file: 'scripts/migrate-event-types.ts' },
  {
    name: '002_migrate_giftlist_categories',
    file: 'scripts/migrate-giftlist-categories.ts',
  },
  {
    name: '003_migrate_gift_categories',
    file: 'scripts/migrate-gift-categories.ts',
  },
]

function migrationFiles() {
  const directory = join(process.cwd(), 'scripts/migrations')
  if (!existsSync(directory)) return []
  return readdirSync(directory)
    .filter(file => file.endsWith('.ts'))
    .sort()
    .map(file => ({
      name: file.replace(/\.ts$/, ''),
      file: join(directory, file),
    }))
}

async function main() {
  const migrations = [...legacyMigrations, ...migrationFiles()]
  const applied = new Set(
    (await prisma.migration.findMany({ select: { name: true } })).map(
      row => row.name
    )
  )

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue

    console.log(`Running migration ${migration.name}...`)
    if (migration.file.startsWith(join(process.cwd(), 'scripts/migrations'))) {
      const module = require(migration.file) as {
        up?: (client: PrismaClient) => Promise<void>
      }
      if (!module.up) {
        throw new Error(`Migration ${migration.name} must export up(prisma).`)
      }
      await module.up(prisma)
    } else {
      execFileSync(
        tsNode,
        ['--compiler-options', compilerOptions, migration.file],
        {
          stdio: 'inherit',
          env: process.env,
        }
      )
    }
    await prisma.migration.create({ data: { name: migration.name } })
    console.log(`Applied migration ${migration.name}.`)
  }

  console.log('Migrations are up to date.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
