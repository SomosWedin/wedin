'use client';

import { createImagesForEvent, deleteEventImage } from '@/actions/data/images';
import { useToast } from '@/hooks/use-toast';
import { uploadEventCoverImagesToAws } from '@/lib/s3';
import { EventCoverFormSchema } from '@/schemas/dashboard';
import { Image as ImageModel } from '@prisma/client';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type FormImage = ImageModel | File;

type EventCoverUpdateFormProps = {
  eventId: string;
  message: string | null;
  images: ImageModel[];
};

export type EventImage = {
  id: string;
  url: string | null;
  fileName: string | null;
};

export function useEventCover({
  eventId,
  message,
  images,
}: EventCoverUpdateFormProps) {
  const coverImages = images.map(image => ({
    id: image.id,
    url: image.url,
    fileName: null,
  }));

  const filledImagesArray: EventImage[] = Array.from(
    { length: 6 },
    (_, index) => ({
      id: coverImages[index]?.id ?? index.toString(),
      url: coverImages[index]?.url ?? null,
      fileName: coverImages[index]?.fileName ?? null,
    })
  );

  const [eventImages, setEventImages] =
    useState<EventImage[]>(filledImagesArray);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imagesUrlToDelete, setImageUrlToDelete] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm({
    // resolver: zodResolver(EventCoverFormSchema),
    defaultValues: {
      eventId: eventId ?? '',
      message: message ?? '',
      images: images as FormImage[],
    },
  });
  const { formState } = form;
  const { isDirty, dirtyFields } = formState;

  const reorderImages = (imagesArray: EventImage[]) => {
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
    const formImages = form.getValues('images');
    const formValueImagesArray = files ? Array.from(files) : [];

    form.setValue('images', [...formImages, ...formValueImagesArray]);

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
              fileName: newFiles[newFileIndex].name,
              url: URL.createObjectURL(newFiles[newFileIndex++]),
            };
          }
          return image;
        });

        const updatedFakeIdImages = fakeIdImages.map(image => {
          if (image.url === null && newFileIndex < newFiles.length) {
            return {
              ...image,
              fileName: newFiles[newFileIndex].name,
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

  const handleRemoveImage = (imageId: string, index: number) => {
    const formImages = form.getValues('images');
    const any = formImages;

    formImages.forEach((image: FormImage) => {
      const isImageModel = (image: FormImage): image is ImageModel => {
        return 'id' in image;
      };

      if (isImageModel(image) && image.id === imageId) {
        // Find the image to delete by its id
        const urlToDelete = formImages.find(
          value => isImageModel(value) && value.id === imageId
        );

        // Filter out the image with the specified id
        const filteredFormImages = formImages.filter(
          value => !isImageModel(value) || value.id !== imageId
        );

        // If urlToDelete is found and is an ImageModel, access its URL
        if (urlToDelete && isImageModel(urlToDelete)) {
          setImageUrlToDelete(prevState => [...prevState, urlToDelete.url!]); // Assert URL is defined
        }

        // Update the form images with the filtered array
        form.setValue('images', filteredFormImages);
      }
    });

    setEventImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index] = { id: imageId, url: null, fileName: null };

      const realIdImages = newImages.filter(
        image => image.id !== null && !/^\d+$/.test(image.id)
      );

      const fakeIdImages = newImages.filter(
        image => image.id === null || /^\d+$/.test(image.id)
      );

      const fakeIdsHasUrl = fakeIdImages.some(image => image.url !== null);
      const realIdsHasNullUrl = realIdImages.some(image => image.url == null);

      if (realIdsHasNullUrl && fakeIdsHasUrl) {
        const smallestFakeIdImage = fakeIdImages.reduce(
          (smallest, image) => {
            if (image.url === null) {
              return smallest;
            }

            const currentId = parseInt(image.id, 10);
            const smallestId = parseInt(smallest.id, 10);

            return currentId < smallestId ? image : smallest;
          },
          fakeIdImages.find(image => image.url !== null) || fakeIdImages[0]
        );

        const smallestFakeIdImageUrl = smallestFakeIdImage.url;
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

        setHasChanges(true);
        return reorderImages(
          [...updatedRealIdImages, ...updatedFakeIdImages].slice(0, 6)
        );
      }

      setHasChanges(true);
      return reorderImages([...realIdImages, ...fakeIdImages].slice(0, 6));
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    form.reset();
  };

  const onSubmit = async (formValue: z.infer<typeof EventCoverFormSchema>) => {
    setLoading(true);

    // const validatedFields = EventCoverFormSchema.safeParse(formValue);
    // if (!validatedFields.success) {
    //   console.log(validatedFields.error);
    //   toast({
    //     title: validatedFields.error.message,
    //     variant: 'destructive',
    //   });
    //   setLoading(false);
    //   return;
    // }

    const realIdImages = eventImages.filter(
      image => image.id !== null && !/^\d+$/.test(image.id)
    );

    // const fakeIdImages = eventImages.filter(
    //   image => image.id === null || /^\d+$/.test(image.id)
    // );

    const imagesToRemove = realIdImages.filter(img => img.url === null);

    if (imagesToRemove.length > 0 && imagesToRemove.length > 0) {
      const deleteImageResult = await deleteEventImage(
        imagesToRemove,
        imagesUrlToDelete
      );

      if (deleteImageResult?.error) {
        toast({
          title: deleteImageResult.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    // const newImages = eventImages.filter(image => image.url);
    const formValueImages = formValue.images;
    const formValueImagesArray = formValueImages
      ? Array.from(formValueImages)
      : [];
    let awsImageUrl: string[] = [];

    // const mergedImages = newImages
    //   .map(newImage => {
    //     const matchingFile = formValueImagesArray.find(
    //       file => file.name === newImage.fileName
    //     );
    //     if (matchingFile) {
    //       return {
    //         ...newImage,
    //         file: matchingFile,
    //       };
    //     }
    //   })
    //   .filter(item => item !== undefined);

    if (formValue.images && formValue.images.length > 0) {
      console.log({ formValue, eventImages });
      console.log('uploadEventCoverImagesToAws', formValueImagesArray);

      // const uploadResponse = await uploadEventCoverImagesToAws({
      //   files: formValueImagesArray,
      //   eventId: formValue.eventId,
      // });
      //
      // if (uploadResponse?.error) {
      //   toast({
      //     title: uploadResponse.error,
      //     variant: 'destructive',
      //   });
      //   setLoading(false);
      //   return;
      // }
      // awsImageUrl = uploadResponse.uploadedImages ?? [];
    }

    if (awsImageUrl.length > 0) {
      console.log('createing images for event');
      // const createImagesResult = await createImagesForEvent({
      //   eventId,
      //   imageUrls: awsImageUrl,
      // });
      //
      // if (createImagesResult?.error) {
      //   toast({
      //     title: createImagesResult.error,
      //     variant: 'destructive',
      //   });
      //   setLoading(false);
      //   return;
      // }
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
    dirtyFields,
    fileInputRef,
    handleAddImages,
    handleButtonClick,
    handleRemoveImage,
    handleReset,
    onSubmit,
    eventImages,
    setEventImages,
    hasChanges,
  };
}
