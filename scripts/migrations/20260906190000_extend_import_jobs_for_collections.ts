import type { PrismaClient } from '@prisma/client'

export async function up(prisma: PrismaClient) {
  await prisma.$runCommandRaw({
    update: 'GiftImportJob',
    updates: [
      {
        q: { kind: { $exists: false } },
        u: { $set: { kind: 'GIFT' } },
        multi: true,
      },
      {
        q: { updatedCount: { $exists: false } },
        u: { $set: { updatedCount: 0 } },
        multi: true,
      },
    ],
  })
  await prisma.$runCommandRaw({
    createIndexes: 'GiftImportJob',
    indexes: [
      {
        key: { kind: 1, status: 1, createdAt: 1 },
        name: 'GiftImportJob_kind_status_createdAt_idx',
      },
    ],
  })
}
