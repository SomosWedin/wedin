'use server';

import type * as z from 'zod';
import prismaClient from '@/prisma/client';
import { BankDetailsFormSchema } from '@/schemas/dashboard';
import { revalidatePath } from 'next/cache';

export async function getBankDetails(eventId: string) {
  try {
    return await prismaClient.bankDetails.findUnique({
      where: {
        eventId: eventId,
      },
    });
  } catch (error) {
    console.error('Error getting bank details:', error);
    return null;
  }
}

export async function updateBankDetails(
  values: z.infer<typeof BankDetailsFormSchema>
): Promise<{ success?: boolean; error?: string }> {
  try {
    const {
      eventId,
      bankName,
      accountNumber,
      accountType,
      accountHolder,
      identificationNumber,
      identificationType,
      razonSocial,
      ruc,
    } = values;

    await prismaClient.bankDetails.upsert({
      where: {
        eventId: eventId,
      },
      update: {
        bankName: bankName,
        accountHolder: accountHolder,
        accountNumber: accountNumber,
        accountType: accountType,
        identificationNumber: identificationNumber,
        identificationType: identificationType,
        razonSocial: razonSocial,
        ruc: ruc,
      },
      create: {
        eventId: eventId,
        bankName: bankName,
        accountHolder: accountHolder,
        accountNumber: accountNumber,
        accountType: accountType,
        identificationNumber: identificationNumber,
        identificationType: identificationType,
        razonSocial: razonSocial,
        ruc: ruc,
      },
    });

    revalidatePath('/bank-details');
    return { success: true };
  } catch (error) {
    console.error('Error upserting bank details:', error);
    return { error: 'Failed to upsert bank details' };
  }
}
