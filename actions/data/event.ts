'use server';

import type { ErrorResponse } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/actions/get-current-user';
import { NextResponse } from 'next/server';

const prismaClient = new PrismaClient();

export const getEvent = async (): Promise<any | ErrorResponse> => {
  const user = await getCurrentUser();

  if (!user)
    return NextResponse.json(
      { error: 'User not authenticated' },
      { status: 401 }
    );

  const userId = user.id;

  try {
    const event = await prismaClient.event.findUnique({
      where: { primaryUserId: userId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return event;
  } catch (error) {
    console.error('Error getting event:', error);
    return NextResponse.json({ error: 'Error getting event' }, { status: 500 });
  }
};