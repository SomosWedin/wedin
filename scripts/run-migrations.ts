import { PrismaClient } from '@prisma/client'
import {
  discoverMigrationFiles,
  runPendingMigrations,
  withMigrationLock,
} from './migration-core'

const prisma = new PrismaClient()

async function main() {
  const migrations = discoverMigrationFiles()

  await withMigrationLock(prisma, async () => {
    const applied = await runPendingMigrations(prisma, migrations, message =>
      console.log(message)
    )

    if (applied.length === 0) {
      console.log('Migrations are up to date.')
    }
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
