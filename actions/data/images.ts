'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prismaClient = new PrismaClient()

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

  try {
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

  try {
    await prismaClient.image.deleteMany({
      where: { id: { in: imageIds } }, // Delete all images with IDs in the provided array
    })
    revalidatePath('/event-details')
    return { success: true }
  } catch (error) {
    console.error('Error deleting event images:', error)
    return { error: 'Error deleting event images' }
  }
}
