const EVENT_SLUG_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

function normalizeHostname(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(':')[0]
    .replace(/\.$/, '');
}

export function getEventSlugFromHost(
  hostHeader: string | null,
  configuredRootDomain: string,
) {
  if (!hostHeader) return null;

  const hostname = normalizeHostname(hostHeader);
  const rootDomain = normalizeHostname(configuredRootDomain);

  // These are the normal application domains, not couple websites.
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`
  ) {
    return null;
  }

  const expectedSuffix = `.${rootDomain}`;

  if (!hostname.endsWith(expectedSuffix)) {
    return null;
  }

  const possibleSlug = hostname.slice(0, -expectedSuffix.length);

  if (!EVENT_SLUG_PATTERN.test(possibleSlug)) {
    return null;
  }

  return possibleSlug;
}
