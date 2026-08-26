'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Image as ImageModel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useRef, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import type { z } from 'zod'
import { suggestCoverMessage } from '@/actions/ai/suggest-cover-message'
import { updateEvent } from '@/actions/data/event'
import { addImages, deleteImages } from '@/actions/data/images'
import { deleteStoredImage } from '@/actions/image-storage'
import { useToast } from '@/hooks/use-toast'
import { prepareImageForUpload } from '@/lib/image-upload'
import { uploadImages } from '@/lib/image-uploader'
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

type CoverImage = ExistingImage | NewImage

export type EventImage = {
  id: string
  url: string | null
  fileName: string | null
}

export const MAX_IMAGES = 6

const toExistingImages = (images: ImageModel[]): ExistingImage[] =>
  images.map(image => ({ ...image, isNew: false }))

export function useEventCover({
  eventId,
  coverMessage,
  images,
}: EventCoverUpdateFormProps) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const savedImagesRef = useRef<ExistingImage[]>(toExistingImages(images))
  const [currentImages, setCurrentImages] = useState<CoverImage[]>(
    savedImagesRef.current
  )
  const [imageErrors, setImageErrors] = useState<string[]>([])
  const [preparingImages, setPreparingImages] = useState(false)
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
  const { isDirty } = form.formState
  const retainedImageIds = new Set(
    currentImages
      .filter((image): image is ExistingImage => !image.isNew)
      .map(image => image.id)
  )
  const hasImageChanges =
    currentImages.some(image => image.isNew) ||
    savedImagesRef.current.some(image => !retainedImageIds.has(image.id))
  const hasChanges = isDirty || hasImageChanges

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
    const files = Array.from(input.files ?? [])

    // Cleared up front because the rest of this handler awaits, and the input
    // must accept the same file again if the user retries.
    input.value = ''

    if (files.length === 0) return

    setPreparingImages(true)
    try {
      const { readyFiles: validFiles, errors } = await prepareFiles(files)
      const availableSlots = Math.max(0, MAX_IMAGES - currentImages.length)
      const filesToAdd = validFiles.slice(0, availableSlots)
      const filesNotAdded = validFiles.slice(availableSlots)
      const errorMessages = [...errors]

      if (validFiles.length > 0 && availableSlots === 0) {
        errorMessages.push(
          `Ya tienes ${MAX_IMAGES} fotos. Elimina alguna para poder subir otra.`
        )
      } else if (filesNotAdded.length > 0) {
        errorMessages.push(
          `Solo puedes tener ${MAX_IMAGES} fotos, así que no agregamos: ${filesNotAdded
            .map(file => file.name)
            .join(', ')}.`
        )
      }

      const imagesToAdd: NewImage[] = filesToAdd.map(file => ({
        id: uuidv4(),
        file,
        url: URL.createObjectURL(file),
        isNew: true,
      }))

      if (imagesToAdd.length > 0) {
        setCurrentImages(previous => [...previous, ...imagesToAdd])
      }

      setImageErrors(Array.from(new Set(errorMessages)))
    } finally {
      setPreparingImages(false)
    }
  }

  const handleRemoveImage = (id: string) => {
    setImageErrors([])

    const imageToRemove = currentImages.find(image => image.id === id)

    if (!imageToRemove) return

    if (imageToRemove.isNew) {
      if (imageToRemove.url) {
        URL.revokeObjectURL(imageToRemove.url)
      }
    }

    setCurrentImages(previous => previous.filter(image => image.id !== id))
  }

  const handleOnSubmit: SubmitHandler<
    z.infer<typeof EventCoverFormSchema>
  > = async data => {
    setLoading(true)
    const newImages = currentImages.filter(
      (image): image is NewImage => image.isNew
    )
    const existingImages = currentImages.filter(
      (image): image is ExistingImage => !image.isNew
    )
    const existingImageIds = new Set(existingImages.map(image => image.id))
    const imagesToDelete = savedImagesRef.current.filter(
      image => !existingImageIds.has(image.id)
    )
    const persistedNewImages: ExistingImage[] = []

    try {
      if (newImages.length > 0) {
        const uploadResponse = await uploadImages(
          newImages.map(image => image.file)
        )

        if (uploadResponse.error || !uploadResponse.imageUrls) {
          toast({
            title: uploadResponse.error,
            variant: 'destructive',
          })
          return
        }

        const addImagesResponse = await addImages({
          eventId,
          imageUrls: uploadResponse.imageUrls,
        })

        if (addImagesResponse.error || !addImagesResponse.images) {
          toast({
            title: addImagesResponse.error,
            variant: 'destructive',
          })
          return
        }

        persistedNewImages.push(
          ...addImagesResponse.images.map(image => ({
            id: image.id,
            url: image.url,
            isNew: false as const,
          }))
        )
      }

      if (imagesToDelete.length > 0) {
        const deleteImagesResponse = await deleteImages({
          imageIds: imagesToDelete.map(image => image.id),
        })

        if (deleteImagesResponse?.error) {
          toast({
            title: deleteImagesResponse.error,
            variant: 'destructive',
          })
          return
        }

        for (const image of imagesToDelete) {
          if (!image.url) continue

          void deleteStoredImage(image.url).then(response => {
            if (response.error) {
              toast({
                title: response.error,
                variant: 'destructive',
              })
            }
          })
        }
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
          return
        }
      }

      for (const image of newImages) {
        if (image.url) URL.revokeObjectURL(image.url)
      }

      const savedImages = [...existingImages, ...persistedNewImages]
      savedImagesRef.current = savedImages
      setCurrentImages(savedImages)
      setImageErrors([])
      form.reset({ coverMessage: data.coverMessage })

      toast({
        title: 'La portada del evento se actualizó con éxito. 📸',
      })

      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    for (const image of currentImages) {
      if (image.isNew && image.url) {
        URL.revokeObjectURL(image.url)
      }
    }

    setCurrentImages(savedImagesRef.current)
    setImageErrors([])
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
