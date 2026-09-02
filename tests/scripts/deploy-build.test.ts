import { describe, expect, it } from 'vitest'
import { runDeployBuild, shouldRunMigrations } from '../../scripts/deploy-build'

describe('deployment build command', () => {
  it('runs migrations before the production build', () => {
    const commands: string[][] = []

    runDeployBuild(command => commands.push(command), {
      VERCEL_ENV: 'production',
    })

    expect(commands).toEqual([['migrate:deploy'], ['build']])
  })

  it('skips migrations for preview builds', () => {
    const commands: string[][] = []

    runDeployBuild(command => commands.push(command), {
      VERCEL_ENV: 'preview',
    })

    expect(commands).toEqual([['build']])
    expect(shouldRunMigrations({ VERCEL_ENV: 'preview' })).toBe(false)
  })

  it('stops before building when migrations fail', () => {
    const commands: string[][] = []

    expect(() =>
      runDeployBuild(
        command => {
          commands.push(command)
          if (command[0] === 'migrate:deploy')
            throw new Error('migration failed')
        },
        { VERCEL_ENV: 'production' }
      )
    ).toThrow('migration failed')

    expect(commands).toEqual([['migrate:deploy']])
  })
})
