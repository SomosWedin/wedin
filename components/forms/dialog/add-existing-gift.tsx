'use client';

import PriceInput from '@/components/forms/common/price-input';
import { Button } from '@/components/ui/button';
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
import { ExistingGiftFormValues } from '@/hooks/dialog/forms/use-add-existing-gift';
import type { Category } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import type {
  BaseSyntheticEvent,
  ChangeEventHandler,
  RefObject,
} from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { CiImageOn } from 'react-icons/ci';
import { MdOutlineFileUpload } from 'react-icons/md';

type AddExistingGiftFormProps = {
  form: UseFormReturn<ExistingGiftFormValues>;
  categories: Category[];
  loading: boolean;
  isValid: boolean;
  imagePreview: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onSubmit: (
    event?: BaseSyntheticEvent
  ) => Promise<void>;
  onCancel: () => void;
};

export default function AddExistingGiftForm({
  form,
  categories,
  loading,
  isValid,
  imagePreview,
  fileInputRef,
  onFileChange,
  onSubmit,
  onCancel,
}: AddExistingGiftFormProps) {
  return (
    <Form {...form}>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            Imagen del producto
          </span>

          <div className="flex items-center gap-4 rounded-lg border border-dashed border-borderSecondary p-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-gray-50">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Vista previa del regalo"
                  className="h-full w-full object-cover"
                  width={80}
                  height={80}
                />
              ) : (
                <CiImageOn className="text-3xl text-gray-400" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <input
                id="existing-gift-image-upload"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/heic,image/webp"
                ref={fileInputRef}
                onChange={onFileChange}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-2"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                Subir imagen
                <MdOutlineFileUpload className="text-lg" />
              </Button>

              <p className="text-xs text-textTertiary">
                Se recomienda 1080 x 1080 (1:1),
                hasta 10 MB
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
                <Input
                  {...field}
                  placeholder="Sofá living"
                />
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

              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                </FormControl>

                <SelectContent className="bg-white">
                  {categories.map(category => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                    >
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
            <FormItem className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <FormLabel>
                  El que más queremos ⭐
                </FormLabel>

                <p className="text-sm text-textTertiary">
                  Destacá este regalo para tus
                  invitados
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
            <FormItem className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <FormLabel>
                  Regalo grupal
                </FormLabel>

                <p className="text-sm text-textTertiary">
                  Permite que varios invitados
                  contribuyan a este regalo
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

        <div className="-mx-6 -mb-6 flex justify-end gap-2 rounded-b-lg bg-gray-50 px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
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

            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
