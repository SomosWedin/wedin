'use client';

import React, { useState, useRef } from 'react';
import { updateEventImages } from '@/actions/data/images';
import { updateEvent } from '@/actions/data/event';
import { uploadEventCoverImagesToAws } from '@/lib/s3';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventCoverFormSchema } from '@/schemas/dashboard';
import { z } from 'zod';

type EventCoverUpdateFormProps = {
  eventId: string | null;
  message: string | null;
};

export function useEventCover({
  eventId,
  message,
}: EventCoverUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm({
    // resolver: zodResolver(EventCoverFormSchema),
    defaultValues: {
      eventId: eventId ?? '',
      message: message ?? '',
      images: [] as File[],
    },
  });

  const { formState } = form;
  const { isDirty } = formState;

  const handleFileChange = (action: React.ChangeEvent<HTMLInputElement>) => {
    const files = action.target.files ? Array.from(action.target.files) : [];

    if (files.length > 0) {
      const newFiles = [...form.getValues('images'), ...files].slice(0, 6);
      const previews = newFiles.map(file => URL.createObjectURL(file));

      form.setValue('images', newFiles);
      setPreviewUrls(previews);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = form.getValues('images');
    const newFiles = currentImages.filter((_, idx) => idx !== index);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));

    form.setValue('images', newFiles);
    setPreviewUrls(newPreviews);
  };

  const handleReset = () => {
    setPreviewUrls([]);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof EventCoverFormSchema>) => {
    console.log("Submitted values:", values);
    setLoading(true);
  
    if (!Object.keys(formState.dirtyFields).length) {
      setLoading(false);
      return;
    }
  
    // const validatedFields = EventCoverFormSchema.safeParse(values);
  
    // if (!validatedFields.success) {
    //   console.log("Validation failed", validatedFields.error)
    //   toast({
    //     title: 'Error',
    //     description: 'Archivo invalido, por favor intenta de nuevo.',
    //     variant: 'destructive',
    //   });
    //   setLoading(false);
    //   return;
    // }
  
    let imageUrls: string[] = [];
  
    if (values.images && values.images.length > 0) {
      const uploadResponse = await uploadEventCoverImagesToAws({
        files: values.images,
        eventId: values.eventId,
      });
  
      if (uploadResponse?.error) {
        toast({
          title: uploadResponse.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
  
      imageUrls = uploadResponse.uploadedImages ?? [];
    }
  
    const updatedEvent = await updateEvent(values.eventId, {
      coverMessage: values.message,
      imageUrls: imageUrls,
    });
  
    if ('error' in updatedEvent) {
      toast({
        title: updatedEvent.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
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
    previewUrls,
    fileInputRef,
    handleFileChange,
    handleButtonClick,
    handleRemoveImage,
    handleReset,
    onSubmit,
  };
}
