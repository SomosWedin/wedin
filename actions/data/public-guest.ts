'use server'

import prismaClient from '@/prisma/client'

const SEARCH_RESULTS_LIMIT = 5

// e.g. "0981234567" -> "*******4567"
function maskPhone(phone: string) {
  const visibleDigits = 4

  if (phone.length <= visibleDigits) return phone

  return `${'*'.repeat(phone.length - visibleDigits)}${phone.slice(-visibleDigits)}`
}

// No session check — public, unauthenticated lookup.
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

// Scoped by eventId so a guest id from another event can't resolve here.
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
