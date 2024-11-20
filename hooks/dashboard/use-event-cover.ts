'use client';

import { updateEvent } from '@/actions/data/event';
import { addImages, deleteImages, updateImage } from '@/actions/data/images';
import { useToast } from '@/hooks/use-toast';
import {
  deleteEventCoverImageFromAws,
  uploadEventCoverImagesToAws,
} from '@/lib/s3';
import { EventCoverFormSchema } from '@/schemas/dashboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image as ImageModel } from '@prisma/client';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

type EventCoverUpdateFormProps = {
  eventId: string;
  coverMessage: string | null;
  images: ImageModel[];
};

interface BaseImage {
  id: string; 
  url: string | null;
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

export type EventImage = {
  id: string;
  url: string | null;
  fileName: string | null;
};

const MAX_IMAGES = 6;

export function useEventCover({
  eventId,
  coverMessage,
  images,
}: EventCoverUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]); // Images initially fetched from the database
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]); // Images currently displayed from the database
  const [newImages, setNewImages] = useState<NewImage[]>([]); // New images added by the user
  const [updatedImages, setUpdatedImages] = useState<UpdatedImage[]>([]); // New images that replace existing ones
  const [replacedImages, setReplacedImages] = useState<{ id: string }[]>([]); // IDs of images marked for replacement
  const [formError, setFormError] = useState<string | null>(null); // Form-level error state
  const [currentImages, setCurrentImages] = useState<BaseImage[]>([]);

  const slots = Array.from({ length: MAX_IMAGES });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(EventCoverFormSchema),
    defaultValues: {
      coverMessage: coverMessage ?? '',
    },
  });
  const { formState } = form;
  const { isDirty, dirtyFields } = formState;

  useEffect(() => {
    const imagesWithIsNew: ExistingImage[] = images.map(img => ({
      ...img,
      isNew: false as const,
    }));
    setInitialImages(imagesWithIsNew); // Store initial images for reference
    setExistingImages(imagesWithIsNew); // Set existing images to display
  }, [images]);

  useEffect(() => {
    setCurrentImages([...existingImages, ...newImages, ...updatedImages]);
  }, [existingImages, newImages, updatedImages]);

  const handleAddImage = (event: ChangeEvent<HTMLInputElement>) => {
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

    const invalidFiles = files.filter(file => !validFiles.includes(file));

    let errorMessage = '';

    if (invalidFiles.length > 0) {
      errorMessage = 'Algunos archivos no son válidos y han sido ignorados.';
    }

    const totalImagesCount =
      existingImages.length + newImages.length + updatedImages.length;
    const availableSlots = MAX_IMAGES - totalImagesCount;

    if (availableSlots <= 0) {
      // No slots available; cannot add any more images
      errorMessage += `Has llegado al límite permitido de imágenes (${MAX_IMAGES}).`;
    } else {
      let filesToAdd: File[] = [];
      let filesNotAdded: File[] = [];

      if (validFiles.length > availableSlots) {
        // Not all valid files can be added
        filesToAdd = validFiles.slice(0, availableSlots);
        filesNotAdded = validFiles.slice(availableSlots);
      } else {
        // All valid files can be added
        filesToAdd = validFiles;
      }

      // Process files to add
      const newImageEntries: NewImage[] = filesToAdd.map(file => ({
        id: uuidv4(),
        file,
        url: URL.createObjectURL(file),
        isNew: true, // New images have isNew: true
      }));

      if (replacedImages.length > 0) {
        // If there are images marked for replacement, assign new images to replace them
        const numReplacements = Math.min(
          replacedImages.length,
          newImageEntries.length
        );

        const replacements: UpdatedImage[] = replacedImages
          .slice(0, numReplacements)
          .map((replacement, index) => {
            const img = newImageEntries[index];
            return {
              ...img,
              replaceId: replacement.id, // Associate with the existing DB image ID
            };
          });

        setUpdatedImages(prev => [...prev, ...replacements]);

        // Remove processed images from replacedImages and newImageEntries
        setReplacedImages(prev => prev.slice(numReplacements));
        newImageEntries.splice(0, numReplacements); // Remove used entries from newImageEntries
      }

      if (newImageEntries.length > 0) {
        setNewImages(prev => [...prev, ...newImageEntries]);
      }

      if (filesNotAdded.length > 0) {
        const fileNamesNotAdded = filesNotAdded.map(file => file.name);
        errorMessage += `Puedes subir hasta ${MAX_IMAGES} imágenes. Los siguientes archivos no fueron añadidos: ${fileNamesNotAdded.join(',')}`;
      }
    }

    // Set the form error if any
    if (errorMessage) {
      setFormError(errorMessage.trim());
    }

    // Clear the input value to allow selecting the same file again if needed
    if (event.target.value) {
      event.target.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    setFormError(null); // Reset any form errors

    // Find the image to remove in any of the arrays
    const imageToRemove =
      existingImages.find(img => img.id === id) ||
      newImages.find(img => img.id === id) ||
      updatedImages.find(img => img.id === id);

    if (!imageToRemove) return;

    if (imageToRemove.isNew) {
      // Handle new image removal
      const newImagesIndex = newImages.findIndex(img => img.id === id);
      if (newImagesIndex !== -1) {
        // Remove from newImages
        setNewImages(prev => prev.filter(img => img.id !== id));
      } else {
        // It's a replacement image
        const updatedImageIndex = updatedImages.findIndex(img => img.id === id);
        if (updatedImageIndex !== -1) {
          const updatedImage = updatedImages[updatedImageIndex];
          setReplacedImages(prev => [...prev, { id: updatedImage.replaceId }]); // Re-add the replaceId to replacedImages
          setUpdatedImages(prev => prev.filter(img => img.id !== id)); // Remove from updatedImages
        }
      }
      // Revoke the object URL to free up memory
      if (imageToRemove.url) {
        URL.revokeObjectURL(imageToRemove.url);
      }
    } else {
      // Handle existing image removal
      setReplacedImages(prev => [...prev, { id }]); // Mark it for replacement
      setExistingImages(prev => prev.filter(img => img.id !== id)); // Remove from existingImages

      // Also remove from updatedImages if it was previously replaced
      setUpdatedImages(prev => prev.filter(img => img.replaceId !== id));
    }
  };

  const handleOnSubmit: SubmitHandler<
    z.infer<typeof EventCoverFormSchema>
  > = async data => {
    setLoading(true);
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
    // newImagesToUpload: [
    //   { file: fileC, tempId: 'newImgC' },
    //   { file: fileD, tempId: 'newImgD' },
    // ],
    // imagesToReplace: [
    //   { file: fileA, replaceId: 'img1', tempId: 'newImgA' },
    //   { file: fileB, replaceId: 'img2', tempId: 'newImgB' },
    // ],
    // imagesToDelete: {
    //   id: [],
    //   url: [
    //     'https://example.com/image1.jpg',
    //     'https://example.com/image2.jpg',
    //   ],
    // },

    if (newImagesToUpload.length > 0) {
      const files = newImagesToUpload.map(({ file }) => file);

      const uploadResponse = await uploadEventCoverImagesToAws({
        files: files,
        eventId,
      });

      if (uploadResponse?.error) {
        toast({
          title: uploadResponse.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (
        uploadResponse.uploadedImages &&
        uploadResponse.uploadedImages.length > 0
      ) {
        const awsImageUrls = uploadResponse.uploadedImages;
        const result = await addImages({ eventId, imageUrls: awsImageUrls });

        if (result?.error) {
          toast({
            title: result.error,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }
    }

    if (imagesToReplace.length > 0) {
      imagesToReplace.map(async image => {
        const uploadResponse = await uploadEventCoverImagesToAws({
          files: [image.file],
          eventId,
        });

        if (uploadResponse?.error) {
          toast({
            title: uploadResponse.error,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (uploadResponse.uploadedImages) {
          const awsImageUrl = uploadResponse.uploadedImages;
          const result = await updateImage({
            imageId: image.replaceId,
            imageUrl: awsImageUrl[0],
          });

          if (result?.error) {
            toast({
              title: result.error,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }
      });
    }

    if (imagesToDelete.id.length > 0) {
      const deleteImageResponse = await deleteImages({
        imageIds: imagesToDelete.id,
      });

      if (deleteImageResponse?.error) {
        toast({
          title: deleteImageResponse.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    if (imagesToDelete.url.length > 0) {
      imagesToDelete.url.map(async imageUrl => {
        const deleteImageResponse =
          await deleteEventCoverImageFromAws(imageUrl);
        if (deleteImageResponse?.error) {
          toast({
            title: deleteImageResponse.error,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      });
    }

    if (data.coverMessage) {
      const updateEventResponse = await updateEvent(eventId, {
        coverMessage: data.coverMessage,
      });

      if (updateEventResponse?.error) {
        toast({
          title: updateEventResponse.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    toast({
      title: 'La portada del evento se actualizó con éxito. 📸',
    });

    setNewImages([]);
    setUpdatedImages([]);
    setReplacedImages([]);
    setFormError(null);

    setLoading(false);
  };

  const handleReset = () => {
    form.reset();
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return {
    currentImages,
    dirtyFields,
    fileInputRef,
    form,
    formError,
    handleButtonClick,
    handleAddImage,
    handleRemoveImage,
    handleOnSubmit,
    handleReset,
    isDirty,
    loading,
    slots,
  };
}
