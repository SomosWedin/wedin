'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Image as ImageModel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import type { z } from 'zod'
import { suggestCoverMessage } from '@/actions/ai/suggest-cover-message'
import { updateEvent } from '@/actions/data/event'
import { addImages, deleteImages, updateImage } from '@/actions/data/images'
import { useToast } from '@/hooks/use-toast'
import { prepareImageForUpload } from '@/lib/image-upload'
import {
  deleteEventCoverImageFromAws,
  uploadEventCoverImagesToAws,
} from '@/lib/s3'
import { EventCoverFormSchema } from '@/schemas/form'

type EventCoverUpdateFormProps = {
  eventId: string
  coverMessage: string | null
  images: ImageModel[]
}

interface BaseImage {
  id: string
  url: string | null
}

interface ExistingImage extends BaseImage {
  isNew: false
}

interface NewImage extends BaseImage {
  file: File
  isNew: true
}

interface UpdatedImage extends NewImage {
  replaceId: string // ID of the existing image being replaced
}

interface DeletedImages {
  id: string[] // IDs of images to delete from the database
  url: string[] // URLs of images to delete from storage (e.g., AWS S3)
}

export type EventImage = {
  id: string
  url: string | null
  fileName: string | null
}

export const MAX_IMAGES = 6

export function useEventCover({
  eventId,
  coverMessage,
  images,
}: EventCoverUpdateFormProps) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]) // Images initially fetched from the database
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]) // Images currently displayed from the database
  const [newImages, setNewImages] = useState<NewImage[]>([]) // New images added by the user
  const [updatedImages, setUpdatedImages] = useState<UpdatedImage[]>([]) // New images that replace existing ones
  const [replacedImages, setReplacedImages] = useState<{ id: string }[]>([]) // IDs of images marked for replacement
  const [imageErrors, setImageErrors] = useState<string[]>([]) // Per-file reasons why a selected image was rejected
  const [preparingImages, setPreparingImages] = useState(false)
  const [currentImages, setCurrentImages] = useState<BaseImage[]>([])
  const slots = Array.from({ length: MAX_IMAGES })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(EventCoverFormSchema),
    defaultValues: {
      coverMessage: coverMessage ?? '',
    },
  })
  const { formState } = form
  const { isDirty, dirtyFields } = formState

  const hasImageChanges =
    newImages.length > 0 ||
    updatedImages.length > 0 ||
    replacedImages.length > 0
  const hasChanges = isDirty || hasImageChanges

  useEffect(() => {
    const imagesWithIsNew: ExistingImage[] = images.map(img => ({
      ...img,
      isNew: false as const,
    }))
    setInitialImages(imagesWithIsNew) // Store initial images for reference
    setExistingImages(imagesWithIsNew) // Set existing images to display
  }, [images])

  useEffect(() => {
    setCurrentImages([...existingImages, ...newImages, ...updatedImages])
  }, [existingImages, newImages, updatedImages])

  const prepareFiles = async (files: File[]) => {
    const readyFiles: File[] = []
    const errors: string[] = []

    for (const file of files) {
      const prepared = await prepareImageForUpload(file)

      if (prepared.ok) {
        readyFiles.push(prepared.file)
      } else {
        errors.push(`${file.name}: ${prepared.message}`)
      }
    }

    return { readyFiles, errors }
  }

  const handleAddImage = async (event: ChangeEvent<HTMLInputElement>) => {
    setImageErrors([])

    const input = event.target
    const files = Array.from(input.files || [])

    // Cleared up front because the rest of this handler awaits, and the input
    // must accept the same file again if the user retries.
    input.value = ''

    if (files.length === 0) return

    setPreparingImages(true)
    const { readyFiles: validFiles, errors } = await prepareFiles(files)
    setPreparingImages(false)

    const errorMessages = [...errors]

    const totalImagesCount =
      existingImages.length + newImages.length + updatedImages.length
    const availableSlots = MAX_IMAGES - totalImagesCount

    if (availableSlots <= 0) {
      if (validFiles.length > 0) {
        errorMessages.push(
          `Ya tienes ${MAX_IMAGES} fotos. Elimina alguna para poder subir otra.`
        )
      }
    } else {
      let filesToAdd: File[] = []
      let filesNotAdded: File[] = []

      if (validFiles.length > availableSlots) {
        // Not all valid files can be added
        filesToAdd = validFiles.slice(0, availableSlots)
        filesNotAdded = validFiles.slice(availableSlots)
      } else {
        // All valid files can be added
        filesToAdd = validFiles
      }

      // Process files to add
      const newImageEntries: NewImage[] = filesToAdd.map(file => ({
        id: uuidv4(),
        file,
        url: URL.createObjectURL(file),
        isNew: true, // New images have isNew: true
      }))

      if (replacedImages.length > 0) {
        // If there are images marked for replacement, assign new images to replace them
        const numReplacements = Math.min(
          replacedImages.length,
          newImageEntries.length
        )

        const replacements: UpdatedImage[] = replacedImages
          .slice(0, numReplacements)
          .map((replacement, index) => {
            const img = newImageEntries[index]
            return {
              ...img,
              replaceId: replacement.id, // Associate with the existing DB image ID
            }
          })

        setUpdatedImages(prev => [...prev, ...replacements])

        // Remove processed images from replacedImages and newImageEntries
        setReplacedImages(prev => prev.slice(numReplacements))
        newImageEntries.splice(0, numReplacements) // Remove used entries from newImageEntries
      }

      if (newImageEntries.length > 0) {
        setNewImages(prev => [...prev, ...newImageEntries])
      }

      if (filesNotAdded.length > 0) {
        const fileNamesNotAdded = filesNotAdded.map(file => file.name)
        errorMessages.push(
          `Solo puedes tener ${MAX_IMAGES} fotos, así que no agregamos: ${fileNamesNotAdded.join(', ')}.`
        )
      }
    }

    if (errorMessages.length > 0) {
      setImageErrors(Array.from(new Set(errorMessages)))
    }
  }

  const handleRemoveImage = (id: string) => {
    setImageErrors([]) // Reset any image errors

    // Find the image to remove in any of the arrays
    const imageToRemove =
      existingImages.find(img => img.id === id) ||
      newImages.find(img => img.id === id) ||
      updatedImages.find(img => img.id === id)

    if (!imageToRemove) return

    if (imageToRemove.isNew) {
      // Handle new image removal
      const newImagesIndex = newImages.findIndex(img => img.id === id)
      if (newImagesIndex !== -1) {
        // Remove from newImages
        setNewImages(prev => prev.filter(img => img.id !== id))
      } else {
        // It's a replacement image
        const updatedImageIndex = updatedImages.findIndex(img => img.id === id)
        if (updatedImageIndex !== -1) {
          const updatedImage = updatedImages[updatedImageIndex]
          setReplacedImages(prev => [...prev, { id: updatedImage.replaceId }]) // Re-add the replaceId to replacedImages
          setUpdatedImages(prev => prev.filter(img => img.id !== id)) // Remove from updatedImages
        }
      }
      // Revoke the object URL to free up memory
      if (imageToRemove.url) {
        URL.revokeObjectURL(imageToRemove.url)
      }
    } else {
      // Handle existing image removal
      setReplacedImages(prev => [...prev, { id }]) // Mark it for replacement
      setExistingImages(prev => prev.filter(img => img.id !== id)) // Remove from existingImages

      // Also remove from updatedImages if it was previously replaced
      setUpdatedImages(prev => prev.filter(img => img.replaceId !== id))
    }
  }

  const handleOnSubmit: SubmitHandler<
    z.infer<typeof EventCoverFormSchema>
  > = async data => {
    setLoading(true)
    // Persisted replacements for images swapped this submit, merged into
    // existingImages on success so the UI reflects real DB records without
    // a page reload.
    const persistedNewImages: ExistingImage[] = []
    const persistedReplacedImages: Record<string, ExistingImage> = {}

    // Prepare new images to upload
    const newImagesToUpload = newImages.map(({ file, id }) => ({
      file,
      tempId: id,
    }))

    // Prepare images to replace existing ones
    const imagesToReplace = updatedImages.map(({ file, replaceId, id }) => ({
      file,
      replaceId,
      tempId: id,
    }))

    // Identify images in replacedImages that were not replaced
    const replacedIds = updatedImages.map(img => img.replaceId)

    const unreplacedImages = replacedImages
      .filter(img => !replacedIds.includes(img.id)) // Images that were marked for replacement but not replaced
      .map(img => img.id)

    // Fetch URLs of unreplaced images for deletion using initialImages
    const unreplacedImageUrls = unreplacedImages
      .map(id => {
        const img = initialImages.find(img => img.id === id)
        return img ? img.url : null
      })
      .filter((url): url is string => Boolean(url)) // Remove nulls

    // Fetch URLs of replaced images for deletion using initialImages
    const replacedImageUrls = updatedImages
      .map(img => {
        const originalImg = initialImages.find(
          orig => orig.id === img.replaceId
        )
        return originalImg ? originalImg.url : null
      })
      .filter((url): url is string => Boolean(url)) // Remove nulls

    // Update imagesToDelete
    const imagesToDelete: DeletedImages = {
      id: unreplacedImages, // IDs of images to delete from the database
      url: [...unreplacedImageUrls, ...replacedImageUrls], // URLs of images to delete from storage
    }

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
      const files = newImagesToUpload.map(({ file }) => file)

      const uploadResponse = await uploadEventCoverImagesToAws({
        files: files,
        eventId,
      })

      if (uploadResponse?.error) {
        toast({
          title: uploadResponse.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      if (
        uploadResponse.uploadedImages &&
        uploadResponse.uploadedImages.length > 0
      ) {
        const awsImageUrls = uploadResponse.uploadedImages
        const result = await addImages({ eventId, imageUrls: awsImageUrls })

        if (result?.error) {
          toast({
            title: result.error,
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

        if (result.images) {
          persistedNewImages.push(
            ...result.images.map(img => ({
              id: img.id,
              url: img.url,
              isNew: false as const,
            }))
          )
        }
      }
    }

    if (imagesToReplace.length > 0) {
      for (const image of imagesToReplace) {
        const uploadResponse = await uploadEventCoverImagesToAws({
          files: [image.file],
          eventId,
        })

        if (uploadResponse?.error) {
          toast({
            title: uploadResponse.error,
            variant: 'destructive',
          })
          setLoading(false)
          return
        }

        if (uploadResponse.uploadedImages) {
          const awsImageUrl = uploadResponse.uploadedImages
          const result = await updateImage({
            imageId: image.replaceId,
            imageUrl: awsImageUrl[0],
          })

          if (result?.error) {
            toast({
              title: result.error,
              variant: 'destructive',
            })
            setLoading(false)
            return
          }

          if (result.image) {
            persistedReplacedImages[image.replaceId] = {
              id: result.image.id,
              url: result.image.url,
              isNew: false,
            }
          }
        }
      }
    }

    if (imagesToDelete.id.length > 0) {
      const deleteImageResponse = await deleteImages({
        imageIds: imagesToDelete.id,
      })

      if (deleteImageResponse?.error) {
        toast({
          title: deleteImageResponse.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
    }

    if (imagesToDelete.url.length > 0) {
      imagesToDelete.url.map(async imageUrl => {
        const deleteImageResponse = await deleteEventCoverImageFromAws(imageUrl)
        if (deleteImageResponse?.error) {
          toast({
            title: deleteImageResponse.error,
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
      })
    }

    if (data.coverMessage) {
      const updateEventResponse = await updateEvent(eventId, {
        coverMessage: data.coverMessage,
      })

      if (updateEventResponse?.error) {
        toast({
          title: updateEventResponse.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
    }

    toast({
      title: 'La portada del evento se actualizó con éxito. 📸',
    })

    // Merge server-persisted images into existingImages so the UI reflects
    // real DB records (ids + permanent URLs) immediately, without waiting
    // on a route refresh or reloading the page. Replaced images were already
    // dropped from existingImages by handleRemoveImage, so their persisted
    // versions are appended alongside the newly-added ones rather than
    // replaced in place.
    const mergedImages = [
      ...existingImages,
      ...Object.values(persistedReplacedImages),
      ...persistedNewImages,
    ]
    setExistingImages(mergedImages)
    setInitialImages(mergedImages)

    // Revoke the blob preview URLs for images we just replaced with the
    // persisted versions above (newly-added ones are freed in this same
    // pass; handleRemoveImage already revokes any the user discarded).
    for (const img of [...newImages, ...updatedImages]) {
      if (img.url) URL.revokeObjectURL(img.url)
    }

    setNewImages([])
    setUpdatedImages([])
    setReplacedImages([])
    setImageErrors([])

    setLoading(false)

    router.refresh()
  }

  const handleReset = () => {
    form.reset()
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleSuggestCoverMessage = async () => {
    setSuggesting(true)
    const result = await suggestCoverMessage(eventId)
    setSuggesting(false)

    if (!result.success) {
      toast({
        title: result.error ?? 'No se pudieron generar sugerencias',
        variant: 'destructive',
      })
      return
    }

    setSuggestions(result.success)
  }

  const applySuggestion = (suggestion: string) => {
    form.setValue('coverMessage', suggestion, {
      shouldDirty: true,
      shouldValidate: true,
    })
    setSuggestions([])
  }

  return {
    applySuggestion,
    currentImages,
    dirtyFields,
    fileInputRef,
    form,
    imageErrors,
    preparingImages,
    handleButtonClick,
    handleAddImage,
    handleRemoveImage,
    handleOnSubmit,
    handleReset,
    handleSuggestCoverMessage,
    hasChanges,
    isDirty,
    loading,
    slots,
    suggesting,
    suggestions,
  }
}
