import type { PrismaClient } from '@prisma/client'

export async function up(prisma: PrismaClient) {
  // createIndexes also creates an absent collection and is safe to repeat.
  await prisma.$runCommandRaw({
    createIndexes: 'GiftImportJob',
    indexes: [
      {
        key: { submissionId: 1 },
        name: 'GiftImportJob_submissionId_key',
        unique: true,
      },
      {
        key: { status: 1, createdAt: 1 },
        name: 'GiftImportJob_status_createdAt_idx',
      },
      { key: { createdAt: 1 }, name: 'GiftImportJob_createdAt_idx' },
    ],
  })
  await prisma.$runCommandRaw({
    createIndexes: 'GiftImportRow',
    indexes: [
      {
        key: { jobId: 1, rowNumber: 1 },
        name: 'GiftImportRow_jobId_rowNumber_key',
        unique: true,
      },
      {
        key: { jobId: 1, position: 1 },
        name: 'GiftImportRow_jobId_position_key',
        unique: true,
      },
      {
        key: { jobId: 1, status: 1, position: 1 },
        name: 'GiftImportRow_jobId_status_position_idx',
      },
    ],
  })
  await prisma.$runCommandRaw({
    createIndexes: 'GiftImportHistory',
    indexes: [
      {
        key: { jobId: 1, createdAt: 1 },
        name: 'GiftImportHistory_jobId_createdAt_idx',
      },
    ],
  })
}
