import type { PrismaClient } from '@prisma/client'

const CANONICAL_EVENT_TYPES = [
  { key: 'wedding', name: 'Casamiento' },
  { key: 'birthday', name: 'Cumpleaños' },
  { key: 'baby-shower', name: 'Baby shower' },
  { key: 'sweet-15', name: '15 años' },
  { key: 'other', name: 'Otro tipo de evento' },
]

export async function up(prisma: PrismaClient) {
  // Keep migrations idempotent so retrying after an interrupted run is safe.
  for (const { key, name } of CANONICAL_EVENT_TYPES) {
    // `update` stays empty on purpose: a type that already exists keeps the
    // name an admin gave it, so this only ever fills in what is missing.
    await prisma.eventType.upsert({
      where: { key },
      update: {},
      create: { key, name, categoryIds: [] },
    })
  }
}
