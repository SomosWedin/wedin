'use client';

import ResetEventCoverFormDialog from '@/components/dialog/reset-event-cover-form-dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EventImage, useEventCover } from '@/hooks/dashboard/use-event-cover';
import { Event, Image as ImageModel } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { CiImageOn } from 'react-icons/ci';
import { FaCheck } from 'react-icons/fa6';
import { MdOutlineFileUpload } from 'react-icons/md';
import { RxCross2 } from 'react-icons/rx';

type EventDetailsUpdateFormProps = {
  event: Event & {
    images: ImageModel[];
  };
};

const EventDetailsUpdateForm = ({ event }: EventDetailsUpdateFormProps) => {
  const { images, coverMessage, id } = event;
  const {
    loading,
    fileInputRef,
    handleAddImages,
    handleButtonClick,
    handleRemoveImage,
    form,
    handleReset,
    onSubmit,
    isDirty,
    eventImages,
    dirtyFields,
    hasChanges,
  } = useEventCover({ eventId: id, message: coverMessage, images });

  const countNullUrls = (images: EventImage[]) => {
    return images.reduce((count, image) => {
      return image.url === null ? count + 1 : count;
    }, 0);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8 w-full"
        noValidate
      >
        <div className="flex flex-col gap-6 items-center pb-10 w-full border-b border-gray-200 sm:flex-row">
          <div className="flex flex-col gap-2 w-full sm:w-1/2">
            <h2 className="text-xl font-medium">Fotos</h2>
            <p className="text-textTertiary">
              Puedes subir hasta 6 fotos horizontales, con un peso máximo de 40
              mb cada uno
            </p>
          </div>

          <div className="flex flex-col gap-6 justify-end items-end w-full sm:w-1/2">
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              {eventImages.map((eventImage, index) => (
                <div
                  key={eventImage.id}
                  className="flex relative justify-center items-center w-16 h-24 bg-gray-50 rounded-md border-2 border-dashed border-borderSecondary"
                >
                  {eventImage.url ? (
                    <>
                      <Image
                        src={eventImage.url}
                        alt={`preview-${eventImage.id}`}
                        className="object-cover w-full h-full"
                        width={64}
                        height={96}
                      />
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="absolute top-0 right-0"
                        onClick={() => handleRemoveImage(eventImage.id, index)}
                      >
                        <RxCross2 />
                      </Button>
                    </>
                  ) : (
                    <>
                      <CiImageOn className="text-3xl text-gray-400" />
                    </>
                  )}
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <>
                      <input
                        id="imageUpload"
                        type="file"
                        className="hidden"
                        accept="image/jpeg, image/png, image/heic, image/webp, image/svg+xml"
                        ref={fileInputRef}
                        onChange={event => {
                          handleAddImages(event);
                          field.onChange(event.target.files);
                        }}
                        multiple
                      />
                      <Button
                        type="button"
                        variant="success"
                        onClick={handleButtonClick}
                        disabled={countNullUrls(eventImages) === 0}
                      >
                        Subir imagen
                        <MdOutlineFileUpload className="text-xl" />
                      </Button>
                    </>
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="text" className="hidden" {...field} />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 items-center w-full sm:flex-row">
          <div className="flex flex-col gap-2 w-full sm:w-1/2">
            <h2 className="text-xl font-medium">Mensaje de bienvenida</h2>
            <p className="text-textTertiary">
              Escribe un mensaje de bienvenida para tus invitados, puedes usar
              hasta 255 caracteres
            </p>
          </div>
          <div className="flex flex-col gap-6 items-end w-full sm:w-1/2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Textarea
                      placeholder="Escribe un mensaje de bienvenida"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end w-full">
          <ResetEventCoverFormDialog
            handleReset={handleReset}
            isDirty={isDirty}
          />
          <Button
            type="submit"
            variant="success"
            className="gap-2"
            disabled={loading || (!isDirty && !hasChanges)}
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
  );
};

export default EventDetailsUpdateForm;
