import { PrismaClient } from '@prisma/client'
import { discoverMigrationFiles, getMigrationStatuses } from './migration-core'

const prisma = new PrismaClient()

async function main() {
  const files = discoverMigrationFiles()
  const applied = await prisma.migration.findMany({
    select: {
      version: true,
      name: true,
      checksum: true,
    },
  })
  const statuses = getMigrationStatuses(files, applied)

  if (statuses.length === 0) {
    console.log('No migrations found.')
    return
  }

  console.table(
    statuses.map(status => ({
      Status: status.status,
      Migration: status.version,
    }))
  )

  if (
    statuses.some(status => ['modified', 'missing'].includes(status.status))
  ) {
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
