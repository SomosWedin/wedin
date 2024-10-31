'use server';

import type { ErrorResponse } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { deleteEventCoverImageFromAws } from '@/lib/s3';

const prismaClient = new PrismaClient();

export async function getEventImages(
  eventId: string
): Promise<string[] | ErrorResponse> {
  try {
    const images = await prismaClient.image.findMany({
      where: { eventId },
      select: { url: true },
    });

    return images.map(image => image.url);
  } catch (error) {
    console.error('Error getting event images:', error);
    return { error: 'Error getting event images' };
  }
}

export async function updateEventImages({
  eventId,
  imageUrls,
}: {
  eventId: string;
  imageUrls: string[];
}) {
  if (!imageUrls || imageUrls.length === 0) {
    return { error: 'No image URLs provided' };
  }

  const imageData = imageUrls.map(url => ({
    eventId,
    url,
  }));

  try {
    await prismaClient.image.createMany({
      data: imageData,
    });
    return { success: true };
  } catch (error) {
    console.error('Error uploading event images:', error);
    return { error: 'Error uploading event images' };
  }
}

export async function deleteEventImage(
  images: { imageId: string; imageUrl: string }[]
) {
  try {
    for (const { imageId, imageUrl } of images) {
      await prismaClient.image.delete({
        where: { id: imageId },
      });
      await deleteEventCoverImageFromAws(imageUrl);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting event image:', error);
    return { error: 'Error deleting event image' };
  }
}
