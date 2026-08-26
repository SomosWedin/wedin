import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const rawName = process.argv.slice(2).join('-').trim()
if (!rawName) {
  console.error('Usage: yarn migration:create <name>')
  process.exit(1)
}

const name = rawName
  .toLocaleLowerCase('en-US')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '')
const timestamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, '')
  .slice(0, 14)
const filename = `${timestamp}_${name}.ts`
const directory = join(process.cwd(), 'scripts/migrations')
mkdirSync(directory, { recursive: true })
const path = join(directory, filename)

writeFileSync(
  path,
  `import type { PrismaClient } from '@prisma/client'\n\nexport async function up(prisma: PrismaClient) {\n  // Implement the migration here.\n}\n\nvoid up\n`
)
console.log(`Created ${path}`)
