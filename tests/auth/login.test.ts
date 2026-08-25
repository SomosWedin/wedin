import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  headers: vi.fn(),

  cooldownLimit: vi.fn(),
  emailLimit: vi.fn(),
  ipLimit: vi.fn(),
}))

vi.mock('@/auth', () => ({
  signIn: mocks.signIn,
}))

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}))

vi.mock('@/lib/rate-limit', () => ({
  magicLinkCooldown: {
    limit: mocks.cooldownLimit,
  },

  magicLinkEmailLimit: {
    limit: mocks.emailLimit,
  },

  magicLinkIpLimit: {
    limit: mocks.ipLimit,
  },
}))

import { login } from '@/actions/auth/login'

describe('magic-link login rate limiting', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_SECRET = 'test-rate-limit-secret'

    mocks.headers.mockResolvedValue({
      get(name: string) {
        if (name === 'x-forwarded-for') {
          return '203.0.113.10'
        }

        return null
      },
    })

    mocks.cooldownLimit.mockResolvedValue({
      success: true,
    })

    mocks.emailLimit.mockResolvedValue({
      success: true,
    })

    mocks.ipLimit.mockResolvedValue({
      success: true,
    })

    mocks.signIn.mockResolvedValue(undefined)
  })

  it('sends the magic link when every limit passes', async () => {
    const result = await login({
      email: 'USER@example.com',
    })

    expect(mocks.signIn).toHaveBeenCalledTimes(1)

    expect(mocks.signIn).toHaveBeenCalledWith('resend', {
      email: 'user@example.com',
      redirect: false,
      redirectTo: '/onboarding',
    })

    expect(result).toHaveProperty('success')
  })

  it('does not send when the email cooldown fails', async () => {
    mocks.cooldownLimit.mockResolvedValue({
      success: false,
    })

    const result = await login({
      email: 'user@example.com',
    })

    expect(mocks.signIn).not.toHaveBeenCalled()
    expect(result).toHaveProperty('success')
  })

  it('does not send when the hourly email limit fails', async () => {
    mocks.emailLimit.mockResolvedValue({
      success: false,
    })

    const result = await login({
      email: 'user@example.com',
    })

    expect(mocks.signIn).not.toHaveBeenCalled()
    expect(result).toHaveProperty('success')
  })

  it('does not send when the IP limit fails', async () => {
    mocks.ipLimit.mockResolvedValue({
      success: false,
    })

    const result = await login({
      email: 'user@example.com',
    })

    expect(mocks.signIn).not.toHaveBeenCalled()
    expect(result).toHaveProperty('success')
  })

  it('rejects an invalid email before checking limits', async () => {
    const result = await login({
      email: 'not-an-email',
    })

    expect(result).toHaveProperty('error')
    expect(mocks.cooldownLimit).not.toHaveBeenCalled()
    expect(mocks.emailLimit).not.toHaveBeenCalled()
    expect(mocks.ipLimit).not.toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

  it('does not send the raw email or IP to Redis', async () => {
    await login({
      email: 'user@example.com',
    })

    const emailKey = mocks.cooldownLimit.mock.calls[0][0]
    const ipKey = mocks.ipLimit.mock.calls[0][0]

    expect(emailKey).not.toBe('user@example.com')
    expect(ipKey).not.toBe('203.0.113.10')

    expect(emailKey).toMatch(/^[a-f0-9]{64}$/)
    expect(ipKey).toMatch(/^[a-f0-9]{64}$/)
  })
})
