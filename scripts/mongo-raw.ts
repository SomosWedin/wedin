import type { Prisma } from '@prisma/client'

export function mongoRawDocuments<T>(result: unknown) {
  if (!Array.isArray(result)) {
    throw new Error('MongoDB raw find did not return a document array.')
  }

  return result as T[]
}

export function mongoValueKey(value: Prisma.InputJsonValue) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Prisma.InputJsonObject
    if (typeof object.$oid === 'string') return object.$oid
  }

  return typeof value === 'string' ? value : JSON.stringify(value)
}
