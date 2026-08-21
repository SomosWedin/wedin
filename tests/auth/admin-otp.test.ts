import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  startAdminSession: vi.fn(),
  headers: vi.fn(),
  sendEmail: vi.fn(),

  cooldownLimit: vi.fn(),
  userLimit: vi.fn(),
  ipLimit: vi.fn(),
  verifyLimit: vi.fn(),

  otpFindFirst: vi.fn(),
  otpCreate: vi.fn(),
  otpUpdate: vi.fn(),
  otpDeleteMany: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/actions/auth/admin-session', () => ({
  startAdminSession: mocks.startAdminSession,
}))

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}))

vi.mock('@/lib/emails', () => ({
  sendEmail: mocks.sendEmail,
  renderEmailLayout: () => '<html></html>',
  renderEmailCode: () => '<p></p>',
}))

vi.mock('@/lib/rate-limit', () => ({
  adminOtpCooldown: { limit: mocks.cooldownLimit },
  adminOtpUserLimit: { limit: mocks.userLimit },
  adminOtpIpLimit: { limit: mocks.ipLimit },
  adminOtpVerifyLimit: { limit: mocks.verifyLimit },
}))

vi.mock('@/prisma/client', () => ({
  default: {
    adminOtp: {
      findFirst: mocks.otpFindFirst,
      create: mocks.otpCreate,
      update: mocks.otpUpdate,
      deleteMany: mocks.otpDeleteMany,
    },
  },
}))

import { createHmac } from 'node:crypto'
import { requestAdminOtp, verifyAdminOtp } from '@/actions/auth/admin-otp'

const ADMIN_SECRET = 'test-admin-session-secret'

const adminUser = {
  id: 'admin-id',
  email: 'staff@somoswedin.com',
  role: 'ADMIN',
}

function hashCode(code: string) {
  return createHmac('sha256', ADMIN_SECRET)
    .update(`admin-otp:${code}`)
    .digest('hex')
}

function activeOtp(code: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'otp-id',
    userId: adminUser.id,
    codeHash: hashCode(code),
    attempts: 0,
    consumedAt: null,
    expires: new Date(Date.now() + 60_000),
    ...overrides,
  }
}

describe('admin OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.RATE_LIMIT_SECRET = 'test-rate-limit-secret'
    process.env.ADMIN_SESSION_SECRET = ADMIN_SECRET

    mocks.headers.mockResolvedValue({
      get(name: string) {
        if (name === 'x-forwarded-for') return '203.0.113.10'

        return null
      },
    })

    mocks.getCurrentUser.mockResolvedValue(adminUser)
    mocks.startAdminSession.mockResolvedValue(true)
    mocks.sendEmail.mockResolvedValue(undefined)

    mocks.cooldownLimit.mockResolvedValue({ success: true })
    mocks.userLimit.mockResolvedValue({ success: true })
    mocks.ipLimit.mockResolvedValue({ success: true })
    mocks.verifyLimit.mockResolvedValue({ success: true })

    mocks.otpCreate.mockResolvedValue({})
    mocks.otpDeleteMany.mockResolvedValue({})
    mocks.otpUpdate.mockImplementation(async ({ data }) => ({
      attempts: data?.attempts?.increment ? 1 : 0,
    }))
  })

  describe('requesting a code', () => {
    it('emails a six-digit code and stores only its hash', async () => {
      const result = await requestAdminOtp()

      expect(result).toHaveProperty('success')
      expect(mocks.sendEmail).toHaveBeenCalledTimes(1)

      const { text } = mocks.sendEmail.mock.calls[0][0]

      const code = text.match(/\d{6}/)?.[0]

      expect(code).toMatch(/^\d{6}$/)

      const stored = mocks.otpCreate.mock.calls[0][0].data

      expect(stored.codeHash).toBe(hashCode(code))
      expect(stored.codeHash).not.toContain(code)
    })

    it('invalidates any previous unconsumed code', async () => {
      await requestAdminOtp()

      expect(mocks.otpDeleteMany).toHaveBeenCalledWith({
        where: { userId: adminUser.id, consumedAt: null },
      })
    })

    it('rejects a non-admin without sending anything', async () => {
      mocks.getCurrentUser.mockResolvedValue({
        ...adminUser,
        role: 'ORGANIZER',
      })

      const result = await requestAdminOtp()

      expect(result).toHaveProperty('error')
      expect(mocks.sendEmail).not.toHaveBeenCalled()
      expect(mocks.otpCreate).not.toHaveBeenCalled()
    })

    it.each([
      ['cooldown', 'cooldownLimit'],
      ['hourly account limit', 'userLimit'],
      ['hourly IP limit', 'ipLimit'],
    ] as const)('does not send when the %s fails', async (_label, limit) => {
      mocks[limit].mockResolvedValue({ success: false })

      const result = await requestAdminOtp()

      expect(result).toHaveProperty('error')
      expect(mocks.sendEmail).not.toHaveBeenCalled()
      expect(mocks.otpCreate).not.toHaveBeenCalled()
    })

    it('does not send the raw user id to Redis', async () => {
      await requestAdminOtp()

      const userKey = mocks.cooldownLimit.mock.calls[0][0]

      expect(userKey).not.toBe(adminUser.id)
      expect(userKey).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('verifying a code', () => {
    it('opens an admin session for the correct code', async () => {
      mocks.otpFindFirst.mockResolvedValue(activeOtp('123456'))

      const result = await verifyAdminOtp({ code: '123456' })

      expect(result).toEqual({ success: true })
      expect(mocks.startAdminSession).toHaveBeenCalledWith(adminUser.id)

      expect(mocks.otpUpdate).toHaveBeenLastCalledWith({
        where: { id: 'otp-id' },
        data: { consumedAt: expect.any(Date) },
      })
    })

    it('rejects a wrong code and counts the attempt', async () => {
      mocks.otpFindFirst.mockResolvedValue(activeOtp('123456'))

      const result = await verifyAdminOtp({ code: '000000' })

      expect(result).toHaveProperty('error')
      expect(mocks.startAdminSession).not.toHaveBeenCalled()

      expect(mocks.otpUpdate).toHaveBeenCalledWith({
        where: { id: 'otp-id' },
        data: { attempts: { increment: 1 } },
      })
    })

    it('burns the code once the attempt cap is reached', async () => {
      mocks.otpFindFirst.mockResolvedValue(activeOtp('123456', { attempts: 4 }))
      mocks.otpUpdate.mockResolvedValue({ attempts: 5 })

      const result = await verifyAdminOtp({ code: '000000' })

      expect(result).toHaveProperty('error')

      expect(mocks.otpUpdate).toHaveBeenLastCalledWith({
        where: { id: 'otp-id' },
        data: { consumedAt: expect.any(Date) },
      })
    })

    it('refuses a code that already hit the attempt cap', async () => {
      mocks.otpFindFirst.mockResolvedValue(activeOtp('123456', { attempts: 5 }))

      const result = await verifyAdminOtp({ code: '123456' })

      expect(result).toHaveProperty('error')
      expect(mocks.startAdminSession).not.toHaveBeenCalled()
      expect(mocks.otpUpdate).not.toHaveBeenCalled()
    })

    it('only considers unconsumed, unexpired codes', async () => {
      mocks.otpFindFirst.mockResolvedValue(null)

      const result = await verifyAdminOtp({ code: '123456' })

      expect(result).toHaveProperty('error')

      expect(mocks.otpFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: adminUser.id,
            consumedAt: null,
            expires: { gt: expect.any(Date) },
          }),
        })
      )
    })

    it('rejects a malformed code before touching the database', async () => {
      const result = await verifyAdminOtp({ code: '12ab' })

      expect(result).toHaveProperty('error')
      expect(mocks.otpFindFirst).not.toHaveBeenCalled()
    })

    it('rejects a non-admin', async () => {
      mocks.getCurrentUser.mockResolvedValue({
        ...adminUser,
        role: 'ORGANIZER',
      })

      const result = await verifyAdminOtp({ code: '123456' })

      expect(result).toHaveProperty('error')
      expect(mocks.otpFindFirst).not.toHaveBeenCalled()
      expect(mocks.startAdminSession).not.toHaveBeenCalled()
    })

    it('stops verifying once the hourly attempt limit is hit', async () => {
      mocks.verifyLimit.mockResolvedValue({ success: false })

      const result = await verifyAdminOtp({ code: '123456' })

      expect(result).toHaveProperty('error')
      expect(mocks.otpFindFirst).not.toHaveBeenCalled()
    })
  })
})
