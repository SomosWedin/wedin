"use client";

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { CiImageOn } from 'react-icons/ci';
import { Textarea } from '@/components/ui/textarea';
import { MdOutlineFileUpload } from 'react-icons/md';
import { RxCross2 } from 'react-icons/rx';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@prisma/client';
import { updateEventImages } from '@/actions/data/event';
import { uploadImageToAws } from '@/lib/s3';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import Image from 'next/image';
import { FaCheck } from 'react-icons/fa6';
import imageOutline from '@/public/images/image.svg';

type DashboardEventDetailsProps = {
  event?: Event | null;
};

export default function DashboardEventDetails({
  event,
}: DashboardEventDetailsProps) {
  const form = useForm({
    // resolver: zodResolver(EventCoverImageFormSchema),
    defaultValues: {
      eventId: event?.id ?? '',
      imagesUrls: [],
    },
  });

  const { formState } = form;

  if (!event) return null;

  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (action: React.ChangeEvent<HTMLInputElement>) => {
    const file = action.target.files?.[0] ?? null;

    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrls(url);
      setSelectedFiles([file]);
    } else {
      setPreviewUrls(null);
      setSelectedFiles(null);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (values: any) => {
    if (selectedFiles) {
      const uploadResponse = await uploadImageToAws({
        file: selectedFiles,
        type: 'eventId',
      });

      if (uploadResponse?.error) {
        toast({
          title: 'Error',
          description: uploadResponse.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const updatedEvent = await updateEventImages({
        eventId: event?.id,
        eventCoverImageUrl: uploadResponse?.imageUrl,
      });

      if (updatedEvent?.error) {
        toast({
          title: 'Error',
          description: updatedEvent.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      toast({
        title: 'Exito! 🖼️🎉',
        description: 'Imagen de la portada actualizada correctamente.',
        className: 'bg-white',
      });
    }
    setLoading(false);
  };

  return (
    <section className="w-full h-full flex justify-start items-center flex-col gap-12">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Presentación</h1>
        <p className="text-textTertiary">
          Haz que tu evento brille: sube fotos y cuenta de qué se trata, para
          que tus invitados se emocionen.
        </p>
      </div>

      <div className="w-full flex flex-col gap-8">
        <div className="w-full flex flex-col sm:flex-row items-center gap-6 border-b border-gray-200 pb-10">
          <div className="w-full sm:w-1/2 flex flex-col gap-2">
            <h2 className="text-xl font-medium">Fotos</h2>
            <p className="text-textTertiary">
              Puedes subir hasta 6 fotos horizontales, con un peso máximo de 40
              mb cada uno
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end">
                <Image
                  src={previewUrls || imageOutline}
                  width={90}
                  height={40}
                  alt="Vista previa de la imagen seleccionada"
                  className="object-cover w-full h-full rounded-xl"
                />
                <input
                  id="imageUpload"
                  type="file"
                  className="hidden"
                  accept="image/jpeg, image/png, image/heic, image/webp, image/svg+xml"
                  ref={fileInputRef}
                  onChange={event => {
                    // onChange(event.target.files?.[0]);
                    handleFileChange(event);
                  }}
                />
                {/* <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
              <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
                <CiImageOn className="text-gray-400 text-3xl" />
              </div>
              <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
                <CiImageOn className="text-gray-400 text-3xl" />
              </div>
              <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
                <CiImageOn className="text-gray-400 text-3xl" />
              </div>
              <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
                <CiImageOn className="text-gray-400 text-3xl" />
              </div>
              <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
                <CiImageOn className="text-gray-400 text-3xl" />
              </div>
              <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
                <CiImageOn className="text-gray-400 text-3xl" />
              </div>
            </div> */}

                <Button variant="success" className="gap-2" onClick={handleButtonClick}>
                  Subir imagen
                  <MdOutlineFileUpload className="text-xl" />
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="w-full flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-1/2 flex flex-col gap-2">
            <h2 className="text-xl font-medium">Mensaje de bienvenida</h2>
            <p className="text-textTertiary">
              Escribe un mensaje de bienvenida para tus invitados, puedes
              escribir hasta 200 letras
            </p>
          </div>
          <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end">
            <div className="w-full max-w-sm">
              <Textarea placeholder="Escribe un mensaje de bienvenida" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                Descartar
                <RxCross2 className="text-xl" />
              </Button>
              <Button variant="success" className="gap-2">
                Guardar
                <FaCheck className="text-lg" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
