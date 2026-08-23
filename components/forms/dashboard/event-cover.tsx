'use client'

import type { Event, Image as ImageModel, User } from '@prisma/client'
import { Loader2, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { CiImageOn } from 'react-icons/ci'
import { FaCheck } from 'react-icons/fa6'
import { MdOutlineFileUpload } from 'react-icons/md'
import { RxCross2 } from 'react-icons/rx'
import EventCoverPreviewDialog from '@/components/dashboard/event-cover-preview-dialog'
import ResetEventCoverFormDialog from '@/components/dialog/reset-event-cover-form-dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import {
  MAX_IMAGES,
  useEventCover,
} from '@/hooks/dashboard/forms/use-event-cover'
import {
  ALLOWED_IMAGE_FORMATS_LABEL,
  IMAGE_UPLOAD_ACCEPT,
  MAX_IMAGE_SIZE_MB,
} from '@/lib/image-upload'

type EventCoverUpdateFormProps = {
  event: Event & {
    images: ImageModel[]
    users: User[]
  }
}

const EventCoverUpdateForm = ({ event }: EventCoverUpdateFormProps) => {
  const { images, coverMessage, id } = event
  const {
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
    loading,
    slots,
    suggesting,
    suggestions,
  } = useEventCover({ eventId: id, coverMessage: coverMessage, images })
  const previewCoverMessage = form.watch('coverMessage')

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleOnSubmit)}
        className="w-full flex flex-col gap-6 sm:gap-8"
      >
        <div className="flex flex-col gap-6 items-center pb-10 w-full border-b border-gray-200 sm:flex-row">
          <div className="flex flex-col gap-2 w-full sm:w-1/2">
            <h2 className="text-xl font-medium">Fotos</h2>
            <p className="text-sm text-textTertiary">
              Puedes subir hasta {MAX_IMAGES} fotos en formato{' '}
              {ALLOWED_IMAGE_FORMATS_LABEL}, de hasta {MAX_IMAGE_SIZE_MB} MB
              cada una.
            </p>
            <p className="text-xs text-textTertiary">
              Tus invitados las verán en un cuadrado (1:1), tanto en el celular
              como en la computadora, así que te recomendamos fotos de al menos
              1200 × 1200 px.
            </p>
          </div>

          <div className="flex flex-col gap-6 justify-end items-end w-full sm:w-1/2">
            <div className="flex flex-nowrap gap-1.5 justify-end sm:gap-2">
              {slots.map((_, index) => {
                const eventImage = currentImages[index]
                return (
                  <div
                    key={index}
                    className="flex relative flex-shrink-0 justify-center items-center w-12 h-12 bg-gray-50 rounded-md border-2 border-dashed sm:w-20 sm:h-20 border-borderSecondary"
                  >
                    {eventImage?.url ? (
                      <>
                        <Image
                          src={eventImage.url}
                          alt={`preview-${eventImage.id}`}
                          className="object-cover w-full h-full"
                          width={64}
                          height={64}
                        />
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="absolute top-0 right-0"
                          onClick={() => handleRemoveImage(eventImage.id)}
                        >
                          <RxCross2 />
                        </Button>
                      </>
                    ) : (
                      <CiImageOn className="text-3xl text-gray-400" />
                    )}
                  </div>
                )
              })}
            </div>

            {imageErrors.length > 0 && (
              <ul className="flex flex-col gap-1 w-full text-sm text-right text-red-600">
                {imageErrors.map(error => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            <input
              id="imageUpload"
              type="file"
              className="hidden"
              accept={IMAGE_UPLOAD_ACCEPT}
              ref={fileInputRef}
              onChange={event => {
                handleAddImage(event)
              }}
              multiple
            />
            <Button
              type="button"
              variant="success"
              onClick={handleButtonClick}
              disabled={preparingImages || currentImages.length >= MAX_IMAGES}
            >
              {preparingImages ? 'Procesando…' : 'Subir imagen'}
              {preparingImages ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <MdOutlineFileUpload className="text-xl ml-2" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 items-center w-full sm:flex-row">
          <div className="flex flex-col gap-2 w-full sm:w-1/2">
            <h2 className="text-xl font-medium">Mensaje de bienvenida</h2>
            <p className="text-textTertiary">
              Escribe un mensaje de bienvenida para tus invitados. Este mensaje
              se va a visualizar en la página principal de tu lista de regalos
              (hasta 255 caracteres).
            </p>
          </div>
          <div className="flex flex-col gap-4 items-end w-full sm:w-1/2">
            <FormField
              control={form.control}
              name="coverMessage"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <div className="relative w-full">
                      <Textarea
                        placeholder="Escribe un mensaje de bienvenida"
                        className="min-h-32 resize-none"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute right-2 bottom-2 gap-2"
                        onClick={handleSuggestCoverMessage}
                        disabled={suggesting}
                      >
                        {suggesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Sugerir con IA</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
            {suggestions.length > 0 && (
              <div className="flex flex-col gap-2 w-full">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="p-3 text-xs sm:text-sm text-left rounded-md border transition-colors border-borderSecondary hover:border-primary hover:bg-gray-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end w-full">
          <EventCoverPreviewDialog
            images={currentImages}
            coverMessage={previewCoverMessage}
            hasUnsavedChanges={hasChanges}
          />
          {hasChanges && (
            <ResetEventCoverFormDialog
              handleReset={handleReset}
              isDirty={hasChanges}
            />
          )}
          <Button
            type="submit"
            variant="success"
            className="gap-2"
            disabled={loading || !hasChanges}
          >
            Guardar
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FaCheck className="text-lg" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default EventCoverUpdateForm
