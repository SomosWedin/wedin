import type { PrismaClient } from '@prisma/client'

// Ordered: "Cumpleaños" has to release the `other` key before "Otros" can take it.
const CANONICAL_KEYS_BY_NAME = [
  { name: 'Casamiento', key: 'wedding' },
  { name: 'Cumpleaños', key: 'birthday' },
  { name: 'Baby Shower', key: 'baby-shower' },
  { name: '15 años', key: 'sweet-15' },
  { name: 'Otros', key: 'other' },
]

function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es-PY')
    .trim()
}

export async function up(prisma: PrismaClient) {
  // Keep migrations idempotent so retrying after an interrupted run is safe.
  const eventTypes = await prisma.eventType.findMany({
    select: { id: true, key: true, name: true },
  })

  for (const { name, key } of CANONICAL_KEYS_BY_NAME) {
    const matches = eventTypes.filter(
      eventType => normalizeName(eventType.name) === normalizeName(name)
    )

    // Rename only on an unambiguous name match, so a database whose event
    // types are named differently is left untouched rather than guessed at.
    const match = matches.length === 1 ? matches[0] : undefined
    if (!match || match.key === key) continue

    const keyHolder = eventTypes.find(eventType => eventType.key === key)
    if (keyHolder && keyHolder.id !== match.id) continue

    await prisma.eventType.update({ where: { id: match.id }, data: { key } })
    match.key = key
  }
}
