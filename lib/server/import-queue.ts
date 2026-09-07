import { Client, Receiver } from '@upstash/qstash'
import prisma from '@/prisma/client'

export const IMPORT_DISPATCH_FAILURE_MESSAGE =
  'No se pudo enviar la importación a QStash. Los datos ya están guardados. Abrí Trabajos de importación en /admin/jobs y seleccioná “Reintentar pendientes y fallidos”.'

export function importDispatchFailure(jobId: string) {
  return {
    error: IMPORT_DISPATCH_FAILURE_MESSAGE,
    jobId,
    queueDispatchFailed: true,
  } as const
}

export function importQueueConfig() {
  const devMode = process.env.NODE_ENV === 'development' && !process.env.VERCEL
  const vercelBase =
    process.env.VERCEL && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : ''
  const base =
    process.env.QSTASH_CALLBACK_URL ||
    (devMode ? 'http://localhost:3000' : vercelBase)
  const url = new URL(base)
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (!devMode && url.protocol !== 'https:')
  )
    throw new Error('Invalid QStash callback configuration')
  return { devMode, base: url.origin }
}

export async function verifyImportSignature(
  request: Request,
  body: string,
  path: string
) {
  try {
    const { devMode, base } = importQueueConfig()
    const receiver = new Receiver({
      devMode,
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
    })
    return await receiver.verify({
      signature: request.headers.get('upstash-signature') || '',
      body,
      url: `${base}${path}`,
    })
  } catch {
    return false
  }
}

export async function dispatchImportJob(
  jobId: string,
  runId: string,
  kind: 'GIFT' | 'COLLECTION' = 'GIFT'
) {
  try {
    const { devMode, base } = importQueueConfig()
    const client = new Client({
      devMode,
      token: process.env.QSTASH_TOKEN || '',
    })
    const path =
      kind === 'COLLECTION'
        ? '/api/jobs/collection-import'
        : '/api/jobs/gift-import'
    await client.publishJSON({
      url: `${base}${path}`,
      body: { jobId, runId },
      retries: 3,
      retryDelay: '95000',
      timeout: '60s',
      failureCallback: `${base}${path}/failure`,
    })
  } catch {
    await prisma.$transaction(async tx => {
      const changed = await tx.giftImportJob.updateMany({
        where: { id: jobId, runId, status: 'QUEUED' },
        data: { status: 'FAILED' },
      })
      if (changed.count)
        await tx.giftImportHistory.create({
          data: {
            jobId,
            attemptId: runId,
            message:
              'No se pudo enviar el siguiente lote a la cola. Reintentá los pendientes desde Trabajos.',
          },
        })
    })
    throw new Error('Import dispatch failed')
  }
}
