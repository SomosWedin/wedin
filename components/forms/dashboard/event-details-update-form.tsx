'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CiImageOn } from 'react-icons/ci';
import { FaCheck } from 'react-icons/fa6';
import { Textarea } from '@/components/ui/textarea';
import { MdOutlineFileUpload } from 'react-icons/md';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RxCross2 } from 'react-icons/rx';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

import { useEventCover } from '@/hooks/dashboard/use-event-cover';

type EventDetailsUpdateFormProps = {
  eventId: string | null;
  imagesUrls: string[] | null;
  message: string | null;
  images: File[];
};

const EventDetailsUpdateForm = ({
  eventId,
  imagesUrls,
  message,
  images,
}: EventDetailsUpdateFormProps) => {
  const { loading, previewUrls, fileInputRef, handleFileChange, handleButtonClick, handleRemoveImage, form, handleReset, onSubmit, isDirty } = useEventCover({ eventId, imagesUrls, message, images });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-8"
        noValidate
      >
        <div className="w-full flex flex-col sm:flex-row items-center gap-6 border-b border-gray-200 pb-10">
          <div className="w-full sm:w-1/2 flex flex-col gap-2">
            <h2 className="text-xl font-medium">Fotos</h2>
            <p className="text-textTertiary">
              Puedes subir hasta 6 fotos horizontales, con un peso máximo de 40
              mb cada uno
            </p>
          </div>

          <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end justify-end">
            <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
              {Array(6)
                .fill(null)
                .map((_, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center"
                  >
                    {previewUrls && previewUrls[idx] ? (
                      <>
                        <Image
                          src={previewUrls[idx]}
                          alt={`preview-${idx}`}
                          className="w-full h-full object-cover"
                          width={64}
                          height={96}
                        />
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="absolute top-0 right-0"
                          onClick={() => handleRemoveImage(idx)}
                        >
                          <RxCross2 />
                        </Button>
                      </>
                    ) : (
                      <CiImageOn className="text-gray-400 text-3xl" />
                    )}
                  </div>
                ))}
            </div>

            <FormField
              control={form.control}
              name="imagesUrls"
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
                          handleFileChange(event);
                        }}
                        multiple
                      />
                      <Button
                        type="button"
                        variant="success"
                        onClick={handleButtonClick}
                        disabled={previewUrls?.length === 6}
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

        <div className="w-full flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-1/2 flex flex-col gap-2">
            <h2 className="text-xl font-medium">Mensaje de bienvenida</h2>
            <p className="text-textTertiary">
              Escribe un mensaje de bienvenida para tus invitados, puedes usar
              hasta 255 caracteres
            </p>
          </div>
          <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end">
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
        <div className="w-full justify-end flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={!isDirty}
              >
                Descartar
                <RxCross2 className="text-xl" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Estas seguro que quieres descartar tus cambios?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esto hara que pierdas todos los cambios que hayas completado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive text-white hover:bg-destructive/85 transition-colors"
                >
                  Si, descartar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            type="submit"
            variant="success"
            className="gap-2"
            // disabled={loading || !isDirty}
          >
            Guardar
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
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
