'use client';

import { deleteEventImage } from '@/actions/data/images';
import { useToast } from '@/hooks/use-toast';
import { EventCoverFormSchema } from '@/schemas/dashboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image as ImageModel } from '@prisma/client';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

type FormImage = ImageModel | File;

type EventCoverUpdateFormProps = {
  eventId: string;
  message: string | null;
  images: ImageModel[];
};

// Interfaces for image types
interface BaseImage {
  id: string; // IDs are strings for both existing and new images
  url: string;
}

interface ExistingImage extends BaseImage {
  isNew: false;
}

interface NewImage extends BaseImage {
  file: File;
  isNew: true;
}

interface UpdatedImage extends NewImage {
  replaceId: string; // ID of the existing image being replaced
}

interface DeletedImages {
  id: string[]; // IDs of images to delete from the database
  url: string[]; // URLs of images to delete from storage (e.g., AWS S3)
}

interface RemainingImage {
  id: string;
  url: string;
}

export type EventImage = {
  id: string;
  url: string | null;
  fileName: string | null;
};

const MAX_IMAGES = 6;

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
    resolver: zodResolver(EventCoverFormSchema),
    defaultValues: {
      message: message ?? '',
    },
  });
  const { formState } = form;
  const { isDirty, dirtyFields } = formState;

  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]); // Images initially fetched from the database
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]); // Images currently displayed from the database
  const [newImages, setNewImages] = useState<NewImage[]>([]); // New images added by the user
  const [updatedImages, setUpdatedImages] = useState<UpdatedImage[]>([]); // New images that replace existing ones
  const [replacedImages, setReplacedImages] = useState<{ id: string }[]>([]); // IDs of images marked for replacement
  const [formError, setFormError] = useState<string | null>(null); // Form-level error state
  const slots = Array.from({ length: MAX_IMAGES });

  useEffect(() => {
    const imagesWithIsNew: ExistingImage[] = images.map(img => ({
      ...img,
      isNew: false as const,
    }));
    setInitialImages(imagesWithIsNew); // Store initial images for reference
    setExistingImages(imagesWithIsNew); // Set existing images to display
  }, [images]);

  // Handle adding images
  const handleImageAdd = (event: ChangeEvent<HTMLInputElement>) => {
    setFormError(null);

    const files = Array.from(event.target.files || []);

    // Validate files start
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(
        file.type
      );
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setFormError('Some files were not valid and have been ignored.');
    }

    const currentImageCount =
      existingImages.length + newImages.length + updatedImages.length;
    if (currentImageCount + validFiles.length > MAX_IMAGES) {
      setFormError(`You can only upload up to ${MAX_IMAGES} images.`);
      return;
    }

    // Validate adding images end

    const newImageEntries: NewImage[] = validFiles.map(file => ({
      id: uuidv4(),
      file,
      url: URL.createObjectURL(file),
      isNew: true, // New images have isNew: true
    }));

    if (replacedImages.length > 0) {
      // If there are images marked for replacement, assign new images to replace them
      const replacements: UpdatedImage[] = replacedImages.map(
        (replacement, index) => {
          const img = newImageEntries[index];
          return {
            ...img,
            replaceId: replacement.id, // Associate with the existing DB image ID
          };
        }
      );

      setUpdatedImages(prev => [...prev, ...replacements]);
      setReplacedImages([]); // Clear replacedImages after processing
      newImageEntries.splice(0, replacements.length); // Remove used entries from newImageEntries
    }

    if (newImageEntries.length > 0) {
      setNewImages(prev => [...prev, ...newImageEntries]);
    }

    // Clear the input value to allow selecting the same file again if needed
    if (event.target.value) {
      event.target.value = '';
    }
  };

  // Handle removing images
  const handleImageRemove = (id: string) => {
    setFormError(null); // Reset any form errors

    const imageToRemove =
      existingImages.find(img => img.id === id) ||
      newImages.find(img => img.id === id) ||
      updatedImages.find(img => img.id === id);

    if (!imageToRemove) return;

    if (imageToRemove.isNew) {
      // Handle new image removal
      // Check if it's in updatedImages (i.e., a replacement image)
      const updatedImageIndex = updatedImages.findIndex(img => img.id === id);
      if (updatedImageIndex !== -1) {
        // It's a replacement image
        const updatedImage = updatedImages[updatedImageIndex];
        setReplacedImages(prev => [...prev, { id: updatedImage.replaceId }]); // Re-add the replaceId to replacedImages
        setUpdatedImages(prev => prev.filter(img => img.id !== id)); // Remove from updatedImages
      } else {
        // It's a new image
        setNewImages(prev => prev.filter(img => img.id !== id)); // Remove from newImages
      }
      // Revoke the object URL to free up memory
      URL.revokeObjectURL(imageToRemove.url);
    } else {
      // Handle existing image removal
      setReplacedImages(prev => [...prev, { id }]); // Mark it for replacement
      setExistingImages(prev => prev.filter(img => img.id !== id)); // Remove from existingImages

      // Also remove from updatedImages if it was previously replaced
      setUpdatedImages(prev => prev.filter(img => img.replaceId !== id));
    }
  };

  // Handle form submission
  const handleOnSubmit: SubmitHandler<
    z.infer<typeof EventCoverFormSchema>
  > = data => {
    // Prepare new images to upload
    const newImagesToUpload = newImages.map(({ file, id }) => ({
      file,
      tempId: id,
    }));

    // Prepare images to replace existing ones
    const imagesToReplace = updatedImages.map(({ file, replaceId, id }) => ({
      file,
      replaceId,
      tempId: id,
    }));

    // Remaining images (unchanged)
    const remainingImages: RemainingImage[] = existingImages.map(img => ({
      id: img.id,
      url: img.url,
    }));

    // Identify images in replacedImages that were not replaced
    const replacedIds = updatedImages.map(img => img.replaceId);

    const unreplacedImages = replacedImages
      .filter(img => !replacedIds.includes(img.id)) // Images that were marked for replacement but not replaced
      .map(img => img.id);

    // Fetch URLs of unreplaced images for deletion using initialImages
    const unreplacedImageUrls = unreplacedImages
      .map(id => {
        const img = initialImages.find(img => img.id === id);
        return img ? img.url : null;
      })
      .filter((url): url is string => Boolean(url)); // Remove nulls

    // Fetch URLs of replaced images for deletion using initialImages
    const replacedImageUrls = updatedImages
      .map(img => {
        const originalImg = initialImages.find(
          orig => orig.id === img.replaceId
        );
        return originalImg ? originalImg.url : null;
      })
      .filter((url): url is string => Boolean(url)); // Remove nulls

    // Update imagesToDelete
    const imagesToDelete: DeletedImages = {
      id: unreplacedImages, // IDs of images to delete from the database
      url: [...unreplacedImageUrls, ...replacedImageUrls], // URLs of images to delete from storage
    };

    // Final submission data
    console.log({
      newImagesToUpload,
      imagesToReplace,
      imagesToDelete,
      remainingImages,
    });

    // Proceed with submission (e.g., send data to backend)
    // ...
  };

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

  const currentImages = [...existingImages, ...newImages, ...updatedImages];

  return {
    dirtyFields,
    eventImages,
    fileInputRef,
    form,
    handleAddImages,
    handleButtonClick,
    handleRemoveImage,
    handleReset,
    hasChanges,
    isDirty,
    loading,
    onSubmit,
    setEventImages,

    //new
    handleImageAdd,
    handleImageRemove,
    handleOnSubmit,
    currentImages,
    slots,
    formError,
  };
}
