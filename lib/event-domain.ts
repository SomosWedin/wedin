export const EVENT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/

function normalizeHostname(value: string) {
  return value.trim().toLowerCase().split(':')[0].replace(/\.$/, '')
}

export function getConfiguredRootDomain() {
  return normalizeHostname(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost')
}

export function getEventSlugFromHost(
  hostHeader: string | null,
  configuredRootDomain: string
) {
  if (!hostHeader) return null

  const hostname = normalizeHostname(hostHeader)
  const rootDomain = normalizeHostname(configuredRootDomain)

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null
  }

  const expectedSuffix = `.${rootDomain}`

  if (!hostname.endsWith(expectedSuffix)) {
    return null
  }

  const possibleSlug = hostname.slice(0, -expectedSuffix.length)

  if (!EVENT_SLUG_PATTERN.test(possibleSlug)) {
    return null
  }

  return possibleSlug
}

/**
 * amelie-y-john.localhost:3000
 * amelie-y-john.somoswedin.com
 * amelie-y-john.wedin-staging.somoswedin.com
 */
export function getPublicEventUrl(eventSlug: string, pathname = '/') {
  if (!EVENT_SLUG_PATTERN.test(eventSlug)) {
    throw new Error(`Invalid event slug: ${eventSlug}`)
  }

  const rootDomain = getConfiguredRootDomain()

  const appUrl = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  )

  appUrl.hostname = `${eventSlug}.${rootDomain}`

  appUrl.pathname = pathname.startsWith('/') ? pathname : `/${pathname}`

  appUrl.search = ''
  appUrl.hash = ''

  if (rootDomain === 'localhost') {
    appUrl.protocol = 'http:'
  } else {
    appUrl.protocol = 'https:'
    appUrl.port = ''
  }

  return appUrl.toString()
}

/**
 * Browser-facing paths used while already on an event subdomain.
 * These paths must not include the internal /e/[slug] prefix.
 */
export const publicEventPaths = {
  home: '/',
  checkout: '/checkout',

  bankTransfer(transactionIds: string[]) {
    const searchParams = new URLSearchParams({
      ref: transactionIds.join(','),
    })

    return `/checkout/transfer?${searchParams.toString()}`
  },
}
