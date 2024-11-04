'use server';

import type { ErrorResponse } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { deleteEventCoverImageFromAws } from '@/lib/s3';
import { EventImage } from '@/hooks/dashboard/use-event-cover';

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

export async function addImages({
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

export async function updateImage({
  imageId,
  imageUrl,
}: {
  imageId: string;
  imageUrl: string;
}) {
  if (!imageUrl || imageUrl.length === 0) {
    return { error: 'No image URL provided' };
  }

  try {
    await prismaClient.image.update({
      where: { id: imageId }, // Target the specific image by ID
      data: { url: imageUrl }, // Update the image URL
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating event image:', error);
    return { error: 'Error updating event image' };
  }
}

export async function deleteImages({ imageIds }: { imageIds: string[] }) {
  if (!imageIds || imageIds.length === 0) {
    return { error: 'No image IDs provided' };
  }

  try {
    await prismaClient.image.deleteMany({
      where: { id: { in: imageIds } }, // Delete all images with IDs in the provided array
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting event images:', error);
    return { error: 'Error deleting event images' };
  }
}

export async function deleteEventImage(
  images: EventImage[],
  imagesUrl: string[]
) {
  const imageIds = images.map(image => image.id);

  try {
    await prismaClient.image.deleteMany({
      where: {
        id: {
          in: imageIds,
        },
      },
    });
  } catch (error) {
    console.error('Prisma Error', error);
    return { error: 'Error deleting event image' };
  }

  try {
    for (const imageUrl of imagesUrl) {
      await deleteEventCoverImageFromAws(imageUrl);
    }
  } catch (error) {
    console.error('AWS Error', error);
    return { error: 'Error deleting event image' };
  }
}

export async function createImagesForEvent({
  eventId,
  imageUrls,
}: {
  eventId: string;
  imageUrls: string[];
}) {
  if (!imageUrls || imageUrls.length === 0) {
    return { error: 'No image URLs provided' };
  }

  // Prepare data for createMany
  const imageData = imageUrls.map(url => ({
    eventId,
    url,
  }));

  try {
    // Use createMany to insert multiple records
    await prismaClient.image.createMany({
      data: imageData,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating images:', error);
    return { error: 'Error creating images' };
  }
}
