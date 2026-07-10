'use server';

import prismaClient from '@/prisma/client';
import { TransactionEditSchema } from '@/schemas/form';
import { GetTransactionsParams } from '@/schemas/params';
import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { getErrorMessage } from '../helper';

export async function getTransactions({
  searchParams,
}: {
  searchParams: z.infer<typeof GetTransactionsParams>;
}) {
  const validatedParams = GetTransactionsParams.safeParse(searchParams);

  if (!validatedParams.success) return [];

  const { eventId, name } = validatedParams.data;

  if (!eventId) return [];

  const query: Prisma.TransactionWhereInput = {
    eventId,
    status: 'COMPLETED',
  };

  if (name) {
    query.payerName = { contains: name.trim(), mode: 'insensitive' };
  }

  try {
    return await prismaClient.transaction.findMany({
      where: query,
      include: { wishlistGift: { include: { gift: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    return [];
  }
}

export async function updateTransactionNotes(
  transactionId: string,
  values: z.infer<typeof TransactionEditSchema>
) {
  const validatedFields = TransactionEditSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Datos inválidos, por favor verifica tus datos.' };
  }

  try {
    await prismaClient.transaction.update({
      where: { id: transactionId },
      data: { notes: validatedFields.data.notes },
    });

    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction notes:', error);
    return { error: getErrorMessage(error) };
  }
}
