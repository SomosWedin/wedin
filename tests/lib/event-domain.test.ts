
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  EVENT_SLUG_PATTERN,
  getConfiguredRootDomain,
  getEventSlugFromHost,
  getPublicEventUrl,
  publicEventPaths,
} from '@/lib/event-domain';
import { EventUrlFormSchema } from '@/schemas/form';

const originalRootDomain =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN;
const originalAppUrl =
  process.env.NEXT_PUBLIC_APP_URL;

describe('event-domain helpers', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN =
      'somoswedin.com';
    process.env.NEXT_PUBLIC_APP_URL =
      'https://www.somoswedin.com';
  });

  afterEach(() => {
    if (originalRootDomain === undefined) {
      delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_ROOT_DOMAIN =
        originalRootDomain;
    }

    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL =
        originalAppUrl;
    }
  });

  it.each([
    'abc',
    'amelie-y-john',
    'a1-b2',
    `a${'b'.repeat(61)}c`,
  ])('accepts the valid slug %s', slug => {
    expect(EVENT_SLUG_PATTERN.test(slug)).toBe(true);
  });

  it.each([
    'a',
    'ab',
    '-abc',
    'abc-',
    'Amelie',
    'amelie.john',
    'amelie_john',
    `a${'b'.repeat(62)}c`,
  ])('rejects the invalid slug %s', slug => {
    expect(EVENT_SLUG_PATTERN.test(slug)).toBe(false);
  });

  it('normalizes the configured root domain', () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN =
      ' SOMOSWEDIN.COM.:443 ';

    expect(getConfiguredRootDomain()).toBe(
      'somoswedin.com',
    );
  });

  it('extracts and normalizes a production event slug', () => {
    expect(
      getEventSlugFromHost(
        'Amelie-Y-John.SomosWedin.com:443',
        'SOMOSWEDIN.COM.',
      ),
    ).toBe('amelie-y-john');
  });

  it('extracts a localhost event slug while ignoring the port', () => {
    expect(
      getEventSlugFromHost(
        'amelie-y-john.localhost:3000',
        'localhost',
      ),
    ).toBe('amelie-y-john');
  });

  it('extracts a staging event slug', () => {
    expect(
      getEventSlugFromHost(
        'amelie-y-john.wedin-staging.somoswedin.com',
        'wedin-staging.somoswedin.com',
      ),
    ).toBe('amelie-y-john');
  });

  it.each([
    'somoswedin.com',
    'www.somoswedin.com',
    'unrelated.vercel.app',
    'nested.amelie-y-john.somoswedin.com',
    '-invalid.somoswedin.com',
  ])('does not treat %s as an event host', host => {
    expect(
      getEventSlugFromHost(host, 'somoswedin.com'),
    ).toBeNull();
  });

  it('builds a production event URL with a clean public path', () => {
    expect(
      getPublicEventUrl(
        'amelie-y-john',
        '/checkout',
      ),
    ).toBe(
      'https://amelie-y-john.somoswedin.com/checkout',
    );
  });

  it('builds a localhost event URL and preserves the development port', () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'localhost';
    process.env.NEXT_PUBLIC_APP_URL =
      'http://localhost:3000';

    expect(getPublicEventUrl('amelie-y-john')).toBe(
      'http://amelie-y-john.localhost:3000/',
    );
  });

  it('builds a staging event URL', () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN =
      'wedin-staging.somoswedin.com';
    process.env.NEXT_PUBLIC_APP_URL =
      'https://wedin-staging.somoswedin.com';

    expect(getPublicEventUrl('amelie-y-john')).toBe(
      'https://amelie-y-john.wedin-staging.somoswedin.com/',
    );
  });

  it.each([
    'invalid.slug',
    '-invalid',
    'invalid-',
    'UPPERCASE',
  ])('refuses to build a public URL for the invalid slug %s', slug => {
    expect(() => getPublicEventUrl(slug)).toThrow();
  });

  it('keeps internal /e routes out of browser-facing event paths', () => {
    expect(publicEventPaths.home).toBe('/');
    expect(publicEventPaths.checkout).toBe('/checkout');
    expect(
      publicEventPaths.bankTransfer(['tx-1', 'tx-2']),
    ).toBe('/checkout/transfer?ref=tx-1%2Ctx-2');

    expect(
      Object.values(publicEventPaths)
        .filter(value => typeof value === 'string')
        .some(value => value.startsWith('/e/')),
    ).toBe(false);
  });

  it.each(['www', 'api', 'admin', 'login'])(
    'rejects the reserved event slug %s',
    slug => {
      const result = EventUrlFormSchema.safeParse({
        eventId: 'event-id',
        eventUrl: slug,
      });

      expect(result.success).toBe(false);
    },
  );

  it.each(['wedin-staging', 'send', 'resend'])(
    'rejects the infrastructure-owned event slug %s',
    slug => {
      const result = EventUrlFormSchema.safeParse({
        eventId: 'event-id',
        eventUrl: slug,
      });

      expect(result.success).toBe(false);
    },
  );
});
