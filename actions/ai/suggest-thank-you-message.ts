'use server';

import { getCurrentUser } from '@/actions/get-current-user';
import { AI_MODEL, anthropic } from '@/lib/anthropic';
import prismaClient from '@/prisma/client';
import { ThankYouSuggestionsSchema } from '@/schemas/ai';

// See suggest-cover-message.ts for why this is hand-written instead of
// the SDK's zodOutputFormat helper (zod/v4 requirement vs. this project's
// Zod v3). Length/count are enforced below via
// ThankYouSuggestionsSchema.safeParse instead of in the JSON Schema.
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
} as const;

export async function suggestThankYouMessage(transactionId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'User not authenticated' };
  }

  const transaction = await prismaClient.transaction.findFirst({
    where: { id: transactionId, event: { users: { some: { id: user.id } } } },
    include: {
      wishlistGift: { include: { gift: true } },
      event: { include: { users: true } },
    },
  });

  if (!transaction) {
    return { error: 'Transaction not found' };
  }

  // Several gifts bought in one checkout share pagoparHash (CARD) or
  // bankTransferGroupId (BANK_TRANSFER) and get thanked together (see
  // updateTransactionNotes) — so the draft should name every gift in the
  // group, not just the one the organizer clicked.
  const groupWhere = transaction.pagoparHash
    ? { pagoparHash: transaction.pagoparHash }
    : transaction.bankTransferGroupId
      ? { bankTransferGroupId: transaction.bankTransferGroupId }
      : null;

  let giftNames: string[];

  if (groupWhere) {
    const siblings = await prismaClient.transaction.findMany({
      where: { ...groupWhere, eventId: transaction.eventId },
      include: { wishlistGift: { include: { gift: true } } },
    });
    giftNames = Array.from(
      new Set(siblings.map(sibling => sibling.wishlistGift.gift.name))
    );
  } else {
    giftNames = [transaction.wishlistGift.gift.name];
  }

  const giftDescription =
    giftNames.length > 1
      ? `los regalos "${giftNames.slice(0, -1).join('", "')}" y "${giftNames[giftNames.length - 1]}"`
      : `el regalo "${giftNames[0]}"`;

  const coupleNames = transaction.event.users
    .map(({ name, lastName }) => [name, lastName].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' y ');

  const payerName = transaction.payerName ?? 'un invitado anónimo';

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system:
        'Escribís mensajes de agradecimiento cortos y cálidos que una pareja de novios (o el organizador de un evento) le envía a un invitado que hizo uno o más regalos, en Paraguay. Cada mensaje debe ser breve (2-3 oraciones), estar en español, sonar genuino y mencionar el/los regalo(s). Responde con exactamente 3 mensajes.',
      messages: [
        {
          role: 'user',
          content: `Escribí 3 mensajes de agradecimiento distintos para ${payerName}, que contribuyó con ${giftDescription}${
            coupleNames ? `, de parte de ${coupleNames}` : ''
          }.`,
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_JSON_SCHEMA },
      },
    });

    const block = response.content.find(b => b.type === 'text');

    if (!block || block.type !== 'text') {
      return { error: 'No se pudieron generar sugerencias, intenta de nuevo' };
    }

    const parsed = ThankYouSuggestionsSchema.safeParse(JSON.parse(block.text));

    if (!parsed.success) {
      return { error: 'No se pudieron generar sugerencias, intenta de nuevo' };
    }

    return { success: parsed.data.suggestions };
  } catch (error) {
    console.error('Error suggesting thank you message:', error);
    return { error: 'No se pudieron generar sugerencias, intenta de nuevo' };
  }
}
