import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

/**
 * Allow one request per minute for the same email.
 */
export const magicLinkCooldown = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '1 m'),
  prefix: 'wedin:magic-link:cooldown',
})

/**
 * Allow five requests per hour for the same email.
 */
export const magicLinkEmailLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'wedin:magic-link:email',
})

/**
 * Allow twenty requests per hour from the same IP address,
 * including requests targeting different email addresses.
 */
export const magicLinkIpLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'wedin:magic-link:ip',
})

/**
 * Allow one admin access code per minute for the same staff account.
 */
export const adminOtpCooldown = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '1 m'),
  prefix: 'wedin:admin-otp:cooldown',
})

/**
 * Allow five admin access codes per hour for the same staff account.
 */
export const adminOtpUserLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'wedin:admin-otp:user',
})

/**
 * Allow ten admin access codes per hour from the same IP address,
 * including requests targeting different staff accounts.
 */
export const adminOtpIpLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'wedin:admin-otp:ip',
})

/**
 * Allow ten verification attempts per hour for the same staff account,
 * on top of the per-code attempt counter.
 */
export const adminOtpVerifyLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'wedin:admin-otp:verify',
})
