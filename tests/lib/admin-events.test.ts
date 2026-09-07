import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type AdminEventListItem, getAdminEventRows } from '@/lib/admin-events'

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
const originalRootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN

function event(
  overrides: Partial<AdminEventListItem> = {}
): AdminEventListItem {
  return {
    id: 'event-1',
    url: 'ana-y-luis',
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    date: new Date('2027-01-10T12:00:00.000Z'),
    eventType: { id: 'wedding', name: 'Casamiento' },
    users: [
      {
        id: 'user-1',
        name: 'Ana',
        lastName: 'Benítez',
        email: 'ana@example.com',
        isPrimary: true,
      },
    ],
    ...overrides,
  }
}

describe('admin event rows', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://somoswedin.com'
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'somoswedin.com'
  })

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl

    if (originalRootDomain === undefined)
      delete process.env.NEXT_PUBLIC_ROOT_DOMAIN
    else process.env.NEXT_PUBLIC_ROOT_DOMAIN = originalRootDomain
  })

  it('uses the primary organizer and configured public event URL', () => {
    const rows = getAdminEventRows([
      event({
        users: [
          {
            id: 'user-secondary',
            name: 'Luis',
            lastName: 'Gómez',
            email: 'luis@example.com',
            isPrimary: false,
          },
          {
            id: 'user-primary',
            name: 'Ana',
            lastName: 'Benítez',
            email: 'ana@example.com',
            isPrimary: true,
          },
        ],
      }),
    ])

    expect(rows[0]).toMatchObject({
      organizerName: 'Ana Benítez',
      organizerEmail: 'ana@example.com',
      publicUrl: 'https://ana-y-luis.somoswedin.com/',
    })
  })

  it('falls back to the first associated organizer for legacy events', () => {
    const rows = getAdminEventRows([
      event({
        users: [
          {
            id: 'user-legacy',
            name: 'Luis',
            lastName: 'Gómez',
            email: 'luis@example.com',
            isPrimary: false,
          },
        ],
      }),
    ])

    expect(rows[0]?.organizerName).toBe('Luis Gómez')
  })

  it('provides explicit labels when organizer, email, URL, or date are absent', () => {
    const rows = getAdminEventRows([
      event({ users: [], url: null, date: null }),
    ])

    expect(rows[0]).toMatchObject({
      organizerName: 'Sin organizador',
      organizerEmail: 'Sin email',
      publicUrl: null,
      date: null,
    })
  })

  it.each([
    ['event ID', 'event-2'],
    ['organizer', 'María López'],
    ['email', 'maria@example.com'],
    ['public URL', 'maria-15.somoswedin.com'],
  ])('searches by %s', (_, search) => {
    const events = [
      event(),
      event({
        id: 'event-2',
        url: 'maria-15',
        eventType: { id: 'birthday', name: '15 años' },
        users: [
          {
            id: 'user-2',
            name: 'María',
            lastName: 'López',
            email: 'maria@example.com',
            isPrimary: true,
          },
        ],
      }),
    ]

    expect(getAdminEventRows(events, { search }).map(row => row.id)).toEqual([
      'event-2',
    ])
  })

  it('filters by event type', () => {
    const rows = getAdminEventRows(
      [
        event(),
        event({
          id: 'event-2',
          eventType: { id: 'birthday', name: '15 años' },
        }),
      ],
      { eventTypeId: 'birthday' }
    )

    expect(rows.map(row => row.id)).toEqual(['event-2'])
  })

  it('shows the newest created event first by default', () => {
    const rows = getAdminEventRows([
      event({ id: 'event-older', createdAt: new Date('2026-01-01') }),
      event({ id: 'event-newer', createdAt: new Date('2026-09-01') }),
    ])

    expect(rows.map(row => row.id)).toEqual(['event-newer', 'event-older'])
  })

  it('sorts event dates while keeping missing dates last', () => {
    const rows = getAdminEventRows(
      [
        event({ id: 'event-no-date', date: null }),
        event({ id: 'event-later', date: new Date('2027-12-01') }),
        event({ id: 'event-sooner', date: new Date('2027-02-01') }),
      ],
      { sortColumn: 'date', sortDirection: 'asc' }
    )

    expect(rows.map(row => row.id)).toEqual([
      'event-sooner',
      'event-later',
      'event-no-date',
    ])
  })
})
