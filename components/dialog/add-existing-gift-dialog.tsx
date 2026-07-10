'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MdOutlineFileUpload } from 'react-icons/md';
import { CiImageOn } from 'react-icons/ci';
import { Loader2 } from 'lucide-react';
import { createGift } from '@/actions/data/gift';
import { createWishlistGift } from '@/actions/data/wishlist-gift';
import { uploadGiftImageToAws } from '@/lib/s3';
import { useToast } from '@/hooks/use-toast';
import { GiftFormSchema } from '@/schemas/form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import PriceInput from '@/components/forms/common/price-input';
import type { Category, Gift, Image as ImageModel } from '@prisma/client';

type AddExistingGiftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift: Gift & { image: ImageModel | null };
  eventId: string;
  wishlistId: string;
  categories: Category[];
};

export default function AddExistingGiftDialog({
  open,
  onOpenChange,
  gift,
  eventId,
  wishlistId,
  categories,
}: AddExistingGiftDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    gift.image?.url ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof GiftFormSchema>>({
    resolver: zodResolver(GiftFormSchema),
    mode: 'all',
    defaultValues: {
      name: gift.name,
      categoryId: gift.categoryId,
      price: gift.price,
      isDefault: false,
      isEditedVersion: false,
      sourceGiftId: gift.id,
      eventId,
      imageUrl: gift.image?.url ?? '',
      wishlistId,
      isFavoriteGift: false,
      isGroupGift: false,
    },
  });
  const { isValid } = form.formState;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    if (event.target.value) {
      event.target.value = '';
    }
  };

  const resetDialog = () => {
    form.reset();
    setImageFile(null);
    setImagePreview(gift.image?.url ?? null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetDialog();
  };

  const onSubmit: SubmitHandler<
    z.infer<typeof GiftFormSchema>
  > = async values => {
    setLoading(true);

    const hasChanges =
      values.name !== gift.name ||
      values.categoryId !== gift.categoryId ||
      values.price !== gift.price ||
      imageFile !== null;

    let giftId = gift.id;

    if (hasChanges) {
      let imageUrl = gift.image?.url ?? '';

      if (imageFile) {
        const uploadResponse = await uploadGiftImageToAws({
          file: imageFile,
          eventId,
        });

        if (uploadResponse.error || !uploadResponse.url) {
          toast({
            title: 'Error al subir la imagen',
            description: uploadResponse.error,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        imageUrl = uploadResponse.url;
      }

      const giftResponse = await createGift({
        ...values,
        isDefault: false,
        isEditedVersion: true,
        sourceGiftId: gift.id,
        imageUrl,
      });

      if (giftResponse.error || !giftResponse.giftId) {
        toast({
          title: 'Error al guardar los cambios del regalo',
          description: giftResponse.error,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      giftId = giftResponse.giftId;
    }

    const linkResponse = await createWishlistGift({
      wishlistId,
      eventId,
      giftId,
      isFavoriteGift: values.isFavoriteGift,
      isGroupGift: values.isGroupGift,
    });

    if (linkResponse.error) {
      toast({
        title: 'Error al agregar el regalo a tu lista',
        description: linkResponse.error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    toast({ title: 'Regalo agregado a tu lista. 🎁' });
    setLoading(false);
    handleOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar regalo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Imagen del producto</span>
              <div className="flex items-center gap-4 p-4 border border-dashed rounded-lg border-borderSecondary">
                <div className="flex overflow-hidden justify-center items-center w-20 h-20 bg-gray-50 rounded-md">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Vista previa del regalo"
                      className="object-cover w-full h-full"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <CiImageOn className="text-3xl text-gray-400" />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <input
                    id="existingGiftImageUpload"
                    type="file"
                    className="hidden"
                    accept="image/jpeg, image/png, image/heic, image/webp"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 w-fit"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Subir imagen
                    <MdOutlineFileUpload className="text-lg" />
                  </Button>
                  <p className="text-xs text-textTertiary">
                    Se recomienda 1080 x 1080 (1:1), hasta 10 MB
                  </p>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Sofá living" {...field} />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white">
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <PriceInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFavoriteGift"
              render={({ field }) => (
                <FormItem className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <FormLabel>El que más queremos ⭐</FormLabel>
                    <p className="text-sm text-textTertiary">
                      Destacá este regalo para tus invitados
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isGroupGift"
              render={({ field }) => (
                <FormItem className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <FormLabel>Regalo grupal</FormLabel>
                    <p className="text-sm text-textTertiary">
                      Permite que varios invitados contribuyan a este regalo
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="success"
                className="gap-2"
                disabled={loading || !isValid}
              >
                Agregar a la lista
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
