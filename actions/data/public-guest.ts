'use server'

import prismaClient from '@/prisma/client'

const SEARCH_RESULTS_LIMIT = 5

// Masks all but the last 4 digits, e.g. "0981234567" -> "*******4567" — only
// used to disambiguate same-name guests on the public search, never the
// full number.
function maskPhone(phone: string) {
  const visibleDigits = 4

  if (phone.length <= visibleDigits) return phone

  return `${'*'.repeat(phone.length - visibleDigits)}${phone.slice(-visibleDigits)}`
}

// Public, unauthenticated guest self-service lookups — no session check
// anywhere in this file, same discipline as actions/data/public-event.ts.
// Deliberately never returns the full phone number.
export async function searchGuestsByName(eventId: string, name: string) {
  const normalizedName = name.trim()

  if (normalizedName.length < 2) return []

  try {
    const guests = await prismaClient.guest.findMany({
      where: {
        eventId,
        name: { contains: normalizedName, mode: 'insensitive' },
      },
      take: SEARCH_RESULTS_LIMIT,
      orderBy: { name: 'asc' },
    })

    return guests.map(guest => ({
      id: guest.id,
      name: guest.name,
      status: guest.status,
      maskedPhone: maskPhone(guest.phone),
    }))
  } catch (error) {
    console.error('Error searching guests by name:', error)
    return []
  }
}

// Individual-link lookup (?g=<guestId>) — scoped to the guest's own id, and
// cross-checked against the event so a guest id from a different event's
// link can never resolve here.
export async function getGuestForEvent(eventId: string, guestId: string) {
  try {
    const guest = await prismaClient.guest.findFirst({
      where: { id: guestId, eventId },
    })

    if (!guest) return null

    return {
      id: guest.id,
      name: guest.name,
      status: guest.status,
    }
  } catch (error) {
    console.error('Error retrieving guest for event:', error)
    return null
  }
}
