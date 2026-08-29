'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/actions/get-current-user'
import {
  deleteStoredImageObject,
  getOwnedStorageKey,
} from '@/lib/server/image-storage'
import prismaClient from '@/prisma/client'

export async function addImages({
  eventId,
  imageUrls,
}: {
  eventId: string
  imageUrls: string[]
}) {
  if (!imageUrls || imageUrls.length === 0) {
    return { error: 'No image URLs provided' }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'No autorizado.' }

  try {
    const event = await prismaClient.event.findFirst({
      where: { id: eventId, users: { some: { id: currentUser.id } } },
      select: { id: true },
    })
    if (!event) return { error: 'No autorizado.' }

    imageUrls.forEach(getOwnedStorageKey)

    const images = await Promise.all(
      imageUrls.map(url =>
        prismaClient.image.create({ data: { eventId, url } })
      )
    )
    revalidatePath('/event-details')
    return { success: true, images }
  } catch (error) {
    console.error('Error uploading event images:', error)
    return { error: 'Error uploading event images' }
  }
}

export async function deleteImages({ imageIds }: { imageIds: string[] }) {
  if (!imageIds || imageIds.length === 0) {
    return { error: 'No image IDs provided' }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'No autorizado.' }

  try {
    const uniqueImageIds = Array.from(new Set(imageIds))
    const images = await prismaClient.image.findMany({
      where: {
        id: { in: uniqueImageIds },
        Event: { users: { some: { id: currentUser.id } } },
      },
      select: { id: true, url: true },
    })
    if (images.length !== uniqueImageIds.length) {
      return { error: 'No autorizado.' }
    }

    for (const image of images) {
      if (image.url) await deleteStoredImageObject(image.url)
    }

    await prismaClient.image.deleteMany({
      where: {
        id: { in: uniqueImageIds },
        Event: { users: { some: { id: currentUser.id } } },
      },
    })
    revalidatePath('/event-details')
    return { success: true }
  } catch (error) {
    console.error('Error deleting event images:', error)
    return { error: 'Error deleting event images' }
  }
}
