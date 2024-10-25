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
  const [eventImages, setEventImages] = useState<
    {
      id: string;
      url: string | null;
    }[]
  >(filledImagesArray);
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(null);
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

  const handleFileChange = (action: React.ChangeEvent<HTMLInputElement>) => {
    const files = action.target.files;

    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      const newFiles = [...form.getValues('images'), ...filesArray].slice(0, 6);
      const previews = newFiles.map(file => URL.createObjectURL(file));

      setPreviewUrls(previews);

      setEventImages(prevImages => {
        // Separate images with real UUIDs and fake numeric IDs
        const realIdImages = prevImages.filter(
          image => image.id !== null && !/^\d+$/.test(image.id)
        );
        const fakeIdImages = prevImages.filter(
          image => image.id === null || /^\d+$/.test(image.id)
        );

        // Fill URLs for real ID images with null URLs first
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

        // Fill remaining slots with fake IDs
        const updatedFakeIdImages = fakeIdImages.map(image => {
          if (newFileIndex < newFiles.length) {
            return {
              ...image,
              url: URL.createObjectURL(newFiles[newFileIndex++]),
            };
          }
          return image;
        });

        // Combine and slice to ensure a maximum of 6 elements
        const updatedImages = [
          ...updatedRealIdImages,
          ...updatedFakeIdImages,
        ].slice(0, 6);

        const reorderedImages = updatedImages.sort((a, b) => {
          if (a.url === null && b.url !== null) return 1;
          if (a.url !== null && b.url === null) return -1;
          if (!/^\d+$/.test(a.id) && /^\d+$/.test(b.id)) return -1;
          if (/^\d+$/.test(a.id) && !/^\d+$/.test(b.id)) return 1;
          return 0;
        });

        return reorderedImages;
      });
    }
  };

  const handleRemoveImage = (imageId: string, index: number) => {
    setEventImages(prevImages => {
      // Step 1: Create a new array and set the URL of the image at the specified index to null
      const newImages = [...prevImages];
      newImages[index] = { id: imageId, url: null };

      // Step 2: Separate images with real UUIDs and fake numeric IDs
      const realIdImages = newImages.filter(image => image.id !== null && !/^\d+$/.test(image.id));
      const fakeIdImages = newImages.filter(image => image.id === null || /^\d+$/.test(image.id));

      // const fakeHasNonNullUrl = fakeIdImages.some(image => image.url !== null);
      // const realHasNullUrl = realIdImages.some(image => image.url == null);

      // Step 3: Find the smallest fake ID image URL
      const smallestFakeIdImageUrl = fakeIdImages.reduce((smallest, image) => {
        const currentId = parseInt(image.id, 10);
        const smallestId = parseInt(smallest.id, 10);

        return currentId < smallestId ? image : smallest;
      }, fakeIdImages[0])?.url;

      // Step 4: Update real ID images by replacing null URLs with the smallest fake ID image URL
      const updatedRealIdImages = realIdImages.map(image => {
        if (image.url === null && smallestFakeIdImageUrl) {
          return {
            ...image,
            url: smallestFakeIdImageUrl,
          };
        }
        return image;
      });

      // Step 5: Update fake ID images to remove the object with url: smallestFakeIdImageUrl
      const updatedFakeIdImages = fakeIdImages.map(image => {
        if (image.url === smallestFakeIdImageUrl) {
          return {
            ...image,
            url: null,
          };
        }
        return image;
      });

      // Step 6: Combine and reorder images
      const updatedImages = [
        ...updatedRealIdImages,
        ...updatedFakeIdImages,
      ].slice(0, 6);

      const reorderedImages = updatedImages.sort((a, b) => {
        if (a.url === null && b.url !== null) return 1;
        if (a.url !== null && b.url === null) return -1;
        if (!/^\d+$/.test(a.id) && /^\d+$/.test(b.id)) return -1;
        if (/^\d+$/.test(a.id) && !/^\d+$/.test(b.id)) return 1;
        return 0;
      });

      // Step 7: Set the updated state
      return reorderedImages;

      // if (fakeHasNonNullUrl && realHasNullUrl) {
      // }

      // const updatedImages = [...realIdImages, ...fakeIdImages].slice(0, 6);
      //
      // const reorderedImages = updatedImages.sort((a, b) => {
      //   if (a.url === null && b.url !== null) return 1;
      //   if (a.url !== null && b.url === null) return -1;
      //   if (!/^\d+$/.test(a.id) && /^\d+$/.test(b.id)) return -1;
      //   if (/^\d+$/.test(a.id) && !/^\d+$/.test(b.id)) return 1;
      //   return 0;
      // });
      //
      // return reorderedImages;
    });
  };

  console.log({ eventImages });

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
      console.log("Validation failed", validatedFields.error)
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
    previewUrls,
    fileInputRef,
    handleFileChange,
    handleButtonClick,
    handleRemoveImage,
    handleReset,
    onSubmit,
    eventImages,
    setEventImages,
  };
}
