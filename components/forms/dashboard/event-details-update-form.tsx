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
import { Textarea } from '@/components/ui/textarea';
import { useEventCover } from '@/hooks/dashboard/use-event-cover';
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
    currentImages,
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
  } = useEventCover({ eventId: id, coverMessage: coverMessage, images });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleOnSubmit)}
        className="w-full flex flex-col gap-8"
      >
        <div className="flex flex-col gap-6 items-center pb-10 w-full border-b border-gray-200 sm:flex-row">
          <div className="flex flex-col gap-2 w-full sm:w-1/2">
            <h2 className="text-xl font-medium">Fotos</h2>
            <p className="text-textTertiary">
              Puedes subir hasta 6 fotos verticales, con un peso máximo de 40 mb
              cada uno
            </p>
          </div>

          <div className="flex flex-col gap-6 justify-end items-end w-full sm:w-1/2">
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              {slots.map((_, index) => {
                const eventImage = currentImages[index];
                return (
                  <div
                    key={index}
                    className="flex relative justify-center items-center w-16 h-24 bg-gray-50 rounded-md border-2 border-dashed border-borderSecondary"
                  >
                    {eventImage && eventImage.url ? (
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
                          onClick={() => handleRemoveImage(eventImage.id)}
                        >
                          <RxCross2 />
                        </Button>
                      </>
                    ) : (
                      <CiImageOn className="text-3xl text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>

            {formError && (
              <div style={{ color: 'red', marginBottom: '10px' }}>
                {formError}
              </div>
            )}

            <>
              <input
                id="imageUpload"
                type="file"
                className="hidden"
                accept="image/jpeg, image/png, image/heic, image/webp, image/svg+xml"
                ref={fileInputRef}
                onChange={event => {
                  handleAddImage(event);
                }}
                multiple
              />
              <Button
                type="button"
                variant="success"
                onClick={handleButtonClick}
                disabled={currentImages.length >= 6}
              >
                Subir imagen
                <MdOutlineFileUpload className="text-xl ml-2" />
              </Button>
            </>
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
              name="coverMessage"
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
            disabled={loading}
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
