'use client';

import { updateEvent } from '@/actions/data/event';
import { useToast } from '@/hooks/use-toast';
import { uploadEventCoverImagesToAws } from '@/lib/s3';
import { EventCoverFormSchema } from '@/schemas/dashboard';
import { Image as ImageModel } from '@prisma/client';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type EventCoverUpdateFormProps = {
  eventId: string;
  message: string | null;
  images: ImageModel[];
};

export type EventImage = {
  id: string;
  url: string | null;
};

export function useEventCover({
  eventId,
  message,
  images,
}: EventCoverUpdateFormProps) {
  const coverImages = images.map(image => ({
    id: image.id,
    url: image.url,
  }));
  const filledImagesArray = [
    ...coverImages,
    ...Array(6 - coverImages.length)
      .fill(null)
      .map((_, index) => ({ id: index.toString(), url: null })),
  ].slice(0, 6);

  const [eventImages, setEventImages] =
    useState<EventImage[]>(filledImagesArray);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm({
    // resolver: zodResolver(EventCoverFormSchema),
    defaultValues: {
      eventId: eventId ?? '',
      message: message ?? '',
      images: [] as File[],
    },
  });
  const { formState } = form;
  const { isDirty } = formState;

  const reorderImages = (imagesArray: { id: string; url: string | null }[]) => {
    return imagesArray.sort((a, b) => {
      if (a.url === null && b.url !== null) return 1;
      if (a.url !== null && b.url === null) return -1;
      if (!/^\d+$/.test(a.id) && /^\d+$/.test(b.id)) return -1;
      if (/^\d+$/.test(a.id) && !/^\d+$/.test(b.id)) return 1;
      return 0;
    });
  };

  const handleAddImages = (action: React.ChangeEvent<HTMLInputElement>) => {
    const files = action.target.files;

    if (files && files.length > 0) {
      const newFiles = Array.from(files);

      setEventImages(prevImages => {
        const realIdImages = prevImages.filter(
          image => image.id !== null && !/^\d+$/.test(image.id)
        );

        const fakeIdImages = prevImages.filter(
          image => image.id === null || /^\d+$/.test(image.id)
        );

        let newFileIndex = 0;

        const updatedRealIdImages = realIdImages.map(image => {
          if (image.url === null && newFileIndex < newFiles.length) {
            return {
              ...image,
              url: URL.createObjectURL(newFiles[newFileIndex++]),
            };
          }
          return image;
        });

        const updatedFakeIdImages = fakeIdImages.map(image => {
          if (image.url === null && newFileIndex < newFiles.length) {
            return {
              ...image,
              url: URL.createObjectURL(newFiles[newFileIndex++]),
            };
          }
          return image;
        });

        return reorderImages(
          [...updatedRealIdImages, ...updatedFakeIdImages].slice(0, 6)
        );
      });
    }
  };

  console.log({ eventImages });

  const handleRemoveImage = (imageId: string, index: number) => {
    setEventImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index] = { id: imageId, url: null };

      const realIdImages = newImages.filter(
        image => image.id !== null && !/^\d+$/.test(image.id)
      );

      const fakeIdImages = newImages.filter(
        image => image.id === null || /^\d+$/.test(image.id)
      );

      const fakeIdsHasUrl = fakeIdImages.some(image => image.url !== null);
      const realIdsHasNullUrl = realIdImages.some(image => image.url == null);

      if (realIdsHasNullUrl && fakeIdsHasUrl) {
        const smallestFakeIdImageUrl = fakeIdImages.reduce(
          (smallest, image) => {
            if (image.url === null) {
              return smallest;
            }

            const currentId = parseInt(image.id, 10);
            const smallestId = parseInt(smallest.id, 10);

            return currentId < smallestId ? image : smallest;
          },
          fakeIdImages.find(image => image.url !== null) || fakeIdImages[0]
        ).url;

        const updatedRealIdImages = realIdImages.map(image => {
          if (image.url === null && smallestFakeIdImageUrl) {
            return {
              ...image,
              url: smallestFakeIdImageUrl,
            };
          }
          return image;
        });

        const updatedFakeIdImages = fakeIdImages.map(image => {
          if (image.url === smallestFakeIdImageUrl) {
            return {
              ...image,
              url: null,
            };
          }
          return image;
        });

        return reorderImages(
          [...updatedRealIdImages, ...updatedFakeIdImages].slice(0, 6)
        );
      }

      return reorderImages([...realIdImages, ...fakeIdImages].slice(0, 6));
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setPreviewUrls([]);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof EventCoverFormSchema>) => {
    setLoading(true);

    if (!Object.keys(formState.dirtyFields).length) {
      setLoading(false);
      return;
    }

    const validatedFields = EventCoverFormSchema.safeParse(values);

    if (!validatedFields.success) {
      toast({
        title: 'Error',
        description: 'Archivo invalido, por favor intenta de nuevo.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    let imageUrls: string[] = [];

    if (values.images && values.images.length > 0) {
      const uploadResponse = await uploadEventCoverImagesToAws({
        files: values.images,
        eventId: values.eventId,
      });

      if (uploadResponse?.error) {
        toast({
          title: uploadResponse.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      imageUrls = uploadResponse.uploadedImages ?? [];
    }

    const updatedEvent = await updateEvent(values.eventId, {
      coverMessage: values.message,
      imageUrls: imageUrls,
    });

    if ('error' in updatedEvent) {
      toast({
        title: updatedEvent.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    toast({
      title: 'La portada de tu evento fue actualizado correctamente. 🖼️🎉',
      className: 'bg-white',
    });

    setLoading(false);
  };

  return {
    form,
    loading,
    isDirty,
    fileInputRef,
    handleFileChange: handleAddImages,
    handleButtonClick,
    handleRemoveImage,
    handleReset,
    onSubmit,
    eventImages,
    setEventImages,
  };
}
