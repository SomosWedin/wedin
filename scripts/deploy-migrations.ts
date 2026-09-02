import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const executableExtension = process.platform === 'win32' ? '.cmd' : ''
const prisma = join(
  process.cwd(),
  'node_modules/.bin',
  `prisma${executableExtension}`
)
const yarn = `yarn${executableExtension}`

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: 'inherit', env: process.env })
}

run(prisma, ['generate'])
run(yarn, ['migrate'])
run(prisma, ['db', 'push'])
