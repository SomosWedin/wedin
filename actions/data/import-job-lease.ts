import type { ImportJobKind, Prisma } from '@prisma/client'

export const IMPORT_LEASE_MS = 90_000
export class ImportBusyError extends Error {}

export async function renewImportLease(
  tx: Prisma.TransactionClient,
  jobId: string,
  runId: string,
  attemptId: string,
  kind: ImportJobKind
) {
  const lease = await tx.giftImportJob.findUnique({
    where: { id: jobId },
    select: {
      kind: true,
      runId: true,
      lockOwner: true,
      lockExpiresAt: true,
    },
  })
  if (
    lease?.kind !== kind ||
    lease.runId !== runId ||
    lease.lockOwner !== attemptId ||
    lease.lockExpiresAt <= new Date()
  )
    throw new ImportBusyError('Worker lease expired')

  await tx.giftImportJob.update({
    where: { id: jobId },
    data: { lockExpiresAt: new Date(Date.now() + IMPORT_LEASE_MS) },
  })
}
