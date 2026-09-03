'use server'

import { getCurrentUser } from '@/actions/get-current-user'
import { AI_MODEL, anthropic } from '@/lib/anthropic'
import { isWeddingEventType } from '@/lib/event-type'
import prismaClient from '@/prisma/client'
import { CoverMessageSuggestionsSchema } from '@/schemas/ai'

// Hand-written instead of the SDK's zodOutputFormat helper, which requires
// zod/v4 — this project is on Zod v3. minLength/maxLength/array length
// aren't valid JSON Schema constraints for structured outputs anyway; the
// real shape (exactly 3, ≤255 chars each) is enforced below via
// CoverMessageSuggestionsSchema.safeParse, same as the helper would do.
const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
} as const

export async function suggestCoverMessage(eventId: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'User not authenticated' }
  }

  const event = await prismaClient.event.findFirst({
    where: { id: eventId, users: { some: { id: user.id } } },
    include: { users: true, eventType: true },
  })

  if (!event) {
    return { error: 'Event not found' }
  }

  const coupleNames = event.users
    .map(({ name, lastName }) => [name, lastName].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' & ')

  const eventDescription = [
    isWeddingEventType(event.eventType) ? 'una boda' : 'un evento',
    coupleNames && `de ${coupleNames}`,
    event.date && `el ${event.date.toLocaleDateString('es-PY')}`,
    event.city &&
      `en ${event.city}${event.country ? `, ${event.country}` : ''}`,
  ]
    .filter(Boolean)
    .join(' ')

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system:
        'Escribís mensajes de bienvenida cortos y cálidos para el sitio de regalos de una boda o evento en Paraguay. Cada mensaje debe tener como máximo 255 caracteres, estar en español, y sonar personal en vez de genérico. Responde con exactamente 3 mensajes.',
      messages: [
        {
          role: 'user',
          content: `Escribí 3 mensajes de bienvenida distintos (uno cálido, uno breve y directo, uno con humor suave) para ${eventDescription}.`,
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_JSON_SCHEMA },
      },
    })

    const block = response.content.find(b => b.type === 'text')

    if (block?.type !== 'text') {
      return { error: 'No se pudieron generar sugerencias, intenta de nuevo' }
    }

    const parsed = CoverMessageSuggestionsSchema.safeParse(
      JSON.parse(block.text)
    )

    if (!parsed.success) {
      return { error: 'No se pudieron generar sugerencias, intenta de nuevo' }
    }

    return { success: parsed.data.suggestions }
  } catch (error) {
    console.error('Error suggesting cover message:', error)
    return { error: 'No se pudieron generar sugerencias, intenta de nuevo' }
  }
}
