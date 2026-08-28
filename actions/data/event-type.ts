'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import { AdminEventTypeSchema, type AdminEventTypeValues } from '@/schemas/form'
import { getErrorMessage } from '../helper'

export async function getEventTypes() {
  try {
    return await prismaClient.eventType.findMany({ orderBy: { name: 'asc' } })
  } catch (error) {
    console.error('Error retrieving event types:', error)
    return []
  }
}

function normalizeEventTypeKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-PY')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function getAvailableEventTypeKey(name: string) {
  const baseKey = normalizeEventTypeKey(name) || 'tipo-de-evento'
  let key = baseKey
  let suffix = 2

  while (
    await prismaClient.eventType.findUnique({
      where: { key },
      select: { id: true },
    })
  ) {
    key = `${baseKey}-${suffix}`
    suffix += 1
  }

  return key
}

export async function createAdminEventType(formData: AdminEventTypeValues) {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN') return { error: 'No autorizado.' }

  const parsed = AdminEventTypeSchema.safeParse(formData)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  try {
    const duplicate = await prismaClient.eventType.findFirst({
      where: {
        name: { equals: parsed.data.name, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (duplicate) {
      return { error: 'Ya existe un tipo de evento con ese nombre.' }
    }

    const key = await getAvailableEventTypeKey(parsed.data.name)
    const eventType = await prismaClient.eventType.create({
      data: {
        name: parsed.data.name,
        key,
        categoryIds: [],
        giftlistIds: [],
      },
    })
    revalidatePath('/admin')
    revalidatePath('/onboarding')
    return { eventTypeId: eventType.id }
  } catch (error) {
    console.error('Error creating admin event type:', error)
    return { error: getErrorMessage(error) }
  }
}
