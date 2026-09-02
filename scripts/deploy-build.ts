import { execFileSync } from 'node:child_process'

const executableExtension = process.platform === 'win32' ? '.cmd' : ''
const yarn = `yarn${executableExtension}`

type Environment = {
  VERCEL_ENV?: string
  RUN_MIGRATIONS?: string
  [key: string]: string | undefined
}

export function shouldRunMigrations(env: Environment) {
  return env.VERCEL_ENV === 'production' || env.RUN_MIGRATIONS === 'true'
}

export function runDeployBuild(
  runCommand: (args: string[]) => void,
  env: Environment = process.env
) {
  if (shouldRunMigrations(env)) {
    runCommand(['migrate:deploy'])
  }

  runCommand(['build'])
}

function run(args: string[]) {
  execFileSync(yarn, args, { stdio: 'inherit', env: process.env })
}

if (require.main === module) {
  runDeployBuild(run)
}
